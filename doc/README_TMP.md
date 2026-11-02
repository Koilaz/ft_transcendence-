# Lancer et tester le jeu

Doc de travail : comment partir d'un depot propre, faire tourner la stack et
tester la partie chat / bots.

---

## 1. Prerequis

- `docker`, `docker compose`, `make`
- ~5 GB de disque pour les poids du modele local
- ~8 GB de RAM libres quand le modele local tourne (il est charge entierement
  en CPU, voir section 6)

---

## 2. Configuration

Trois choses a remplir avant le premier lancement : `.env`, `secrets/`, et
`/etc/hosts` si le domaine n'est pas `localhost`.

### 2.1 `.env`

```bash
cp .env.example .env
```

| Variable | Role | A modifier ? |
|---|---|---|
| `DOMAIN_NAME` | domaine servi par nginx, doit correspondre au CN du certificat et a `/etc/hosts` | seulement si autre chose que `localhost` |
| `NGINX_PORT` | port hote redirige vers le 443 du container nginx | si le 443 est deja pris | (8443 sur les PC de l'ecole sans Sudo)
| `POSTGRES_DB` | nom de la base creee au demarrage | non |
| `POSTGRES_USER` | utilisateur SQL cree au demarrage | non |
| `OLLAMA_DATA_DIR` | dossier hote monte sur `/root/.ollama`, il contient les poids | **oui** |
| `OLLAMA_MODEL` | modele utilise par l'agent local | si tu changes de modele |

Deux pieges :

- `OLLAMA_DATA_DIR` contient `<login>` dans l'exemple. Il faut mettre un vrai
  chemin, existant et accessible en ecriture. A 42 on le met sous `/sgoinfre`
  et pas dans `$HOME`, sinon les poids sautent au nettoyage.
- `OLLAMA_MODEL` doit correspondre **exactement** au modele pull, tag compris.
  `mistral` et `mistral:7b-instruct` sont deux entrees differentes, et sans tag
  explicite ollama stocke sous `:latest`. Le healthcheck au demarrage compare
  cette chaine a la sortie de `ollama list`.

### 2.2 `secrets/`

```bash
cp -r secrets_example secrets
```

Puis remplacer le contenu de chaque fichier. **Une seule valeur brute par
fichier**, pas de `KEY=`, pas de guillemets, pas de ligne vide en trop.

| Fichier | Contenu | Comment l'obtenir |
|---|---|---|
| `postgres_password.txt` | mot de passe de `POSTGRES_USER` | `openssl rand -base64 24` |
| `jwt_secret.txt` | cle de signature des JWT | `openssl rand -hex 32` |
| `mistral_api_key.txt` | cle API Mistral | [console.mistral.ai](https://console.mistral.ai) → API Keys |

`secrets/*.txt` est gitignore : ne jamais committer de vraies valeurs.

Sans cle Mistral valide, seul l'agent local (`mistral_7B_local`) fonctionne.
C'est suffisant pour tester le jeu, les trois agents distants apparaitront
juste en `[KO]` au demarrage.

### 2.3 `/etc/hosts`

Si `DOMAIN_NAME` vaut `localhost`, rien a faire. Sinon :

```bash
echo "127.0.0.1 <DOMAIN_NAME>" | sudo tee -a /etc/hosts
```

---

## 3. Lancement

```bash
make ollama-pull   # une seule fois : telecharge le modele (~4 GB), long
make up            # build les images + lance tout en premier plan
```

`make ollama-pull` est idempotent : il ne retelecharge pas si le modele est
deja la. Il doit tourner **avant** `make up`, sinon l'agent local demarre en
`[KO]`.

Le site est ensuite sur `https://<DOMAIN_NAME>:<NGINX_PORT>`. Le certificat est
auto-signe et regenere par l'entrypoint nginx s'il manque : le navigateur
affiche un avertissement, il faut l'accepter.

### Cibles du Makefile

| Cible | Effet |
|---|---|
| `make up` | build + lance (premier plan) |
| `make down` | arrete et supprime les containers |
| `make start` / `stop` / `restart` | sur les containers existants |
| `make logs` | logs de tous les services |
| `make ps` | etat des containers |
| `make ollama-pull` | telecharge `OLLAMA_MODEL` si absent |
| `make ollama-list` | liste les modeles presents |
| `make clean` | `down` + supprime les volumes |
| `make fclean` | `clean` + `docker system prune -af` |
| `make ollama-clean` | supprime les poids du modele |
| `make ffclean` | `fclean` + `ollama-clean` |
| `make re` | `fclean` puis `up` |

### Apres une modification du code

L'image `game` **copie** les sources, il n'y a pas de bind mount. Tout
changement sous `requirements/game/app/` demande un rebuild :

```bash
docker compose up -d --build game
```

Un simple `make restart` relance l'ancien code : c'est la premiere chose a
verifier quand une modification "ne fait rien".

---

## 4. Verifier que tout est en place

Au demarrage, le service `game` affiche l'etat des agents avant d'accepter des
connexions (aucun token consomme) :

```
Starting game...
--- Etat des agents ---
  [OK] mistral_medium — mistral-medium-3.5 disponible
  [OK] mistral_big — mistral-large-latest disponible
  [OK] mistral_small — mistral-small-latest disponible
  [OK] mistral_7B_local — mistral:7b-instruct pull sur http://ollama:11434
-----------------------
[ollama] prechargement de mistral:7b-instruct...
serveur sur :3000
[ollama] pret en 45292 ms
```

| Ligne | Signification |
|---|---|
| `[KO] mistral_* — MISTRAL_API_KEY absente` | `secrets/mistral_api_key.txt` vide ou mal monte |
| `[KO] mistral_* — HTTP 401` | cle invalide |
| `[KO] mistral_7B_local — modele X pas pull` | `OLLAMA_MODEL` ne correspond pas a `make ollama-list` (tag compris) |
| `[KO] mistral_7B_local — injoignable` | container ollama pas demarre |
| `[ollama] pret en N ms` | modele charge en RAM et cache amorce, le jeu est utilisable |

Le prechargement est lance sans `await` : le serveur accepte les connexions
avant la fin. Les tout premiers tours peuvent donc etre lents ou partir en
timeout tant que `pret en` n'est pas affiche.

---

## 5. Configurer une partie — `requirements/game/app/game/config.js`

```js
export const gameConfig = {
	bots: ['mistral_7B_local', 'mistral_7B_local', 'mistral_7B_local'],
	turnPerRound: 10,
	turnDuration: 25,
	maxPlayers: 6,
	minPlayers: 4,
	startingTimer: 10,
	votingDuration: 45,
};
```

| Champ | Effet |
|---|---|
| `bots` | agents ajoutes a chaque nouvelle room, **un par entree** : c'est la longueur de la liste qui fait le nombre de bots. `[]` pour une partie sans IA |
| `turnPerRound` | nombre de tours par manche |
| `turnDuration` | secondes par tour. Sert aussi de timeout a l'agent local (`turnDuration - 0.5`) |
| `maxPlayers` | la manche demarre immediatement quand la room est pleine |
| `minPlayers` | en dessous, la room reste en `waiting` |
| `startingTimer` | secondes avant le debut une fois `minPlayers` atteint |
| `votingDuration` | secondes de la phase de vote — **pas encore branche**, `Round.startVotingPhase()` est un `#TODO` |

Agents disponibles pour `bots` : `mistral_medium`, `mistral_big`,
`mistral_small` (API Mistral, cle requise) et `mistral_7B_local` (ollama).
On peut melanger, par exemple `['mistral_7B_local', 'mistral_small']`.

La liste est appliquee par `Room.addBots()` a la creation de la room. Si elle
depasse `maxPlayers`, les entrees en trop sont ignorees avec un warning —
sinon la room serait pleine de bots et une nouvelle room serait creee a chaque
joueur qui se connecte.

### Tester seul

Avec `minPlayers: 4` et trois bots, une seule connexion suffit a atteindre le
quorum : le compte a rebours de `startingTimer` part des l'ouverture de la page
et la manche demarre. Pour aller plus vite, baisser `startingTimer`.

Pour tester la logique de tour sans attendre le modele local, mettre
`bots: ['mistral_small']` : l'API repond en une seconde environ.

---
