# Correctifs : WebSocket game/presence, certificat TLS, agents IA au boot

**Branche :** `dev` — **Date :** 01/11/2026 — **Statut :** non commité (à intégrer par un `make`, les sources sont copiées dans les images au build)

## Contexte

Trois symptômes distincts sont remontés le même jour sur la stack locale :

1. **Console navigateur** : `HEAD https://localhost:4443/ws/game 403 (Forbidden)` à chaque chargement
   de la page de jeu.
2. **Agents IA absents** : `mistral_medium — API injoignable : fetch failed` au démarrage du
   conteneur `game` après un reboot de la machine, erreur relayée par le front (« pas d'agent
   mistral medium »), sans guérison spontanée.
3. **WebSocket presence** : deux erreurs rouges à chaque refresh
   (`WebSocket is closed before the connection is established` /
   `connexion interrompue pendant le chargement de la page`), plus retour de l'avertissement de
   certificat auto-signé après chaque recréation du conteneur nginx.

Les trois racines sont indépendantes : une règle nginx trop large, un check d'agents qui
s'exécute avant que le réseau de l'hôte soit prêt, et une socket presence fermée par le
double-montage de React StrictMode.

---

## Partie nginx modifiée

### `requirements/nginx/conf/nginx.conf`

**Ce qui a changé :** dans `location /ws/game`, le refus des handshakes cross-origin ne
s'applique plus à toutes les requêtes, mais uniquement aux handshakes (en-tête `Upgrade`
présent). Le pattern `set`/`if` contourne l'impossibilité de combiner deux `if` en nginx.

```nginx
# Avant :
if ($http_origin != "https://$http_host")
{
    return 403;
}

# Apres :
set $ws_origin_bad "";
if ($http_upgrade != "")
{
    set $ws_origin_bad "ws";
}
if ($http_origin = "https://$http_host")
{
    set $ws_origin_bad "";
}
if ($ws_origin_bad = "ws")
{
    return 403;
}
```

**Pourquoi :** le health check du frontend (`gameSocket.ts : waitForGameServer`) fait un
`fetch('/ws/game', { method: 'HEAD' })`. Un fetch same-origin en HEAD n'envoie pas d'en-tête
`Origin` (le navigateur ne l'envoie que sur les requêtes CORS et les POST), donc l'ancien `if`
refusait la requête en 403 **avant de la proxifier** vers le service game. Double conséquence :

- erreur rouge en console à chaque chargement de page ;
- `waitForGameServer` recevait 403, qui est différent de 502, donc répondait « service prêt »
  immédiatement : le health check ne distinguait plus un service game down d'un service game up.

La protection anti-CSWSH (Cross-Site WebSocket Hijacking) est conservée à l'identique :
handshake avec Origin étrangère → 403, handshake sans Origin (client non-navigateur) → 403,
handshake avec la bonne Origin → 101. Vérifié par curl sur les quatre cas.

### `requirements/nginx/tools/entrypoint.sh`

**Ce qui a changé :** le certificat auto-signé généré au premier démarrage inclut désormais un
`subjectAltName` :

```bash
# Avant :
openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=FR/ST=France/L=Paris/O=42/OU=Transcendence/CN=$DOMAIN_NAME"

# Apres :
openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=FR/ST=France/L=Paris/O=42/OU=Transcendence/CN=$DOMAIN_NAME" \
    -addext "subjectAltName=DNS:$DOMAIN_NAME,DNS:localhost,IP:127.0.0.1"
```

**Pourquoi :** les navigateurs modernes ignorent le `CN` et exigent un SAN ; sans lui Chrome
affiche `ERR_CERT_COMMON_NAME_INVALID`, ce qui fait revenir l'avertissement de certificat.
Or un WebSocket n'a **pas** de dialogue d'acceptation de certificat : si l'exception n'est pas
enregistrée pour le couple `host:port`, `wss://` échoue silencieusement. La seule façon
d'accepter est de naviguer en HTTPS simple sur la même origine
(ex. `https://localhost:4443/ws/presence`).

**À savoir :** le certificat est régénéré à chaque **recréation** du conteneur nginx
(`make down` + `up`, `make clean`, rebuild) : il faut réaccepter l'exception dans le navigateur
après chacune. Faire de `/etc/nginx/ssl` un volume éviterait cela si ça devient pénible.

---

## Partie game modifiée

### `requirements/game/app/agents/index_agent.js`

**Ce qui a changé :** `BOOT_ATTEMPTS` passe de 10 à 30 (un essai par seconde).

**Pourquoi :** le check d'agents au démarrage insiste 10 s sur les seules pannes « unreachable ».
Or après un boot de machine, la sortie réseau de l'hôte peut mettre 20-30 s à devenir
opérationnelle : le check tombait exactement dans cette fenêtre et marquait les 4 agents Mistral
KO après avoir essuyé 10 `fetch failed` consécutifs, alors que l'API était joignable quelques
secondes plus tard.

### `requirements/game/app/server.js`

**Ce qui a changé :** ajout d'un filet de re-vérification après le boot. Si des bots sont
indisponibles après le check initial, leurs agents sont re-testés toutes les 30 s (au plus
10 fois, soit 5 minutes), sans bloquer l'écoute du serveur.

```js
const BOOT_RECHECK_DELAY_S = 30;
const BOOT_RECHECK_ATTEMPTS = 10;

function recheckDownAgentsAfterBoot()
{
	let attempts = 0;
	const timer = setInterval(() =>
	{
		attempts++;
		recheckDownAgents().finally(() =>
		{
			if (attempts >= BOOT_RECHECK_ATTEMPTS || !unavailableBots().length)
				clearInterval(timer);
		});
	}, BOOT_RECHECK_DELAY_S * 1000);
	timer.unref();
}

if (unavailableBots().length)
	recheckDownAgentsAfterBoot();
```

**Pourquoi :** l'état des agents est calculé une fois au démarrage, et le re-check existant
(`queue.js : scheduleRecheck`) ne s'active **que si des joueurs attendent en file**. Sans file,
un boot raté laissait les bots morts jusqu'au prochain restart du conteneur — ce qui a forcé un
`docker-compose restart game` manuel. Le filet répare tout seul un boot tombé pendant la fenêtre
réseau. Coût négligeable : la sonde Mistral facture ~17 tokens, on ne re-teste que les agents
déjà KO, et la série s'arrête dès que tout est revenu.

---

## Partie frontend modifiée

### `requirements/frontend/app/src/services/presenceSocket.ts`

**Ce qui a changé :** `connectPresenceSocket` devient un singleton, et la fermeture passe par
une nouvelle fonction `schedulePresenceClose` qui la diffère de 250 ms :

- même token + socket vivante (`OPEN` ou `CONNECTING`) → la socket existante est réutilisée,
  pas de nouvelle connexion ;
- le cleanup programme la fermeture au lieu de l'exécuter ; un `connectPresenceSocket`
  ultérieur annule la fermeture programmée ;
- un cleanup d'une session déjà remplacée ne ferme pas la socket courante (comparaison au
  singleton).

### `requirements/frontend/app/src/App.tsx`

**Ce qui a changé :** le cleanup de l'effet de la socket presence appelle
`schedulePresenceClose(socket)` au lieu de `socket.close(1000, 'Session ended')`.

**Pourquoi (les deux fichiers) :** en dev, React StrictMode monte, démonte puis remonte
aussitôt chaque composant. L'ancien cleanup fermait la première socket **pendant son
établissement** : le navigateur logguait deux erreurs rouges (`WebSocket is closed before the
connection is established`, `connexion interrompue pendant le chargement de la page`) et chaque
chargement de page ouvrait deux connexions dont une tuée. Avec la fermeture différée, le
remontage annule la fermeture et réutilise la socket : une seule connexion, plus d'erreur. En
vrai départ (déconnexion, changement de token), la fermeture a toujours lieu, proprement.

**Limite connue :** une déconnexion réelle dans la seconde qui suit la connexion pourrait
fermer une socket encore en établissement (même message console). Cas marginal, accepté.

---

## Validation

- `HEAD /ws/game` sans Origin → 204 (le health check atteint le service game) ; handshakes
  WS testés en 403 / 403 / 101 selon l'Origin : protection anti-CSWSH intacte.
- `npx tsc --noEmit -p tsconfig.app.json` passe dans le conteneur frontend (le `tsconfig.json`
  racine est en style « solution » : `tsc --noEmit` sans `-p` ne compile rien, faux positif).
- Syntaxe des fichiers game validée par `node --check` dans le conteneur.
- Logs backend observés après refresh : `User 4 connected to presence`, une seule connexion
  stable.

## À faire au prochain `make`

`make` (= `up --build`) intègre tout ; ciblé : `make nginx game frontend`. Après la recréation
du conteneur nginx, **réaccepter le certificat** une dernière fois (le SAN entre en vigueur à
cette occasion) via `https://localhost:4443/ws/presence` dans le navigateur.
