# Lancer et tester le jeu

Doc de travail : comment partir d'un depot propre, faire tourner la stack et
tester la partie chat / bots.

Pour les conventions de branches et de commits, voir [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

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
| `OLLAMA_MODEL` | modele utilise par l'agent local, **obligatoire** | si tu changes de modele |

Deux pieges :

- `OLLAMA_DATA_DIR` contient `<login>` dans l'exemple. Il faut mettre un vrai
  chemin, existant et accessible en ecriture. A 42 on le met sous `/sgoinfre`
  et pas dans `$HOME`, sinon les poids sautent au nettoyage.
- `OLLAMA_MODEL` doit correspondre **exactement** au modele pull, tag compris.
  `llama3.2` et `llama3.2:3b` sont deux entrees differentes, et sans tag
  explicite ollama stocke sous `:latest`. Le healthcheck au demarrage compare
  cette chaine a la sortie de `ollama list`. Elle n'a pas de valeur par defaut :
  ollama ne choisit pas de modele tout seul, il faut lui en nommer un.

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

Sans cle Mistral valide, seul l'agent local (`local_agent`) fonctionne.
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
  [OK] local_agent — llama3.2:3b pull sur http://ollama:11434
-----------------------
[ollama] prechargement de llama3.2:3b (prompt_basic)...
serveur sur :3000
[ollama] pret en 45292 ms
```

| Ligne | Signification |
|---|---|
| `[KO] mistral_* — MISTRAL_API_KEY absente` | `secrets/mistral_api_key.txt` vide ou mal monte |
| `[KO] mistral_* — HTTP 401` | cle invalide |
| `[KO] local_agent — OLLAMA_MODEL non defini` | la variable manque dans `.env` |
| `[KO] local_agent — modele X pas pull` | `OLLAMA_MODEL` ne correspond pas a `make ollama-list` (tag compris) |
| `[KO] local_agent — injoignable` | container ollama pas demarre |
| `[ollama] pret en N ms` | modele charge en RAM et cache amorce, le jeu est utilisable |

Le prechargement est lance sans `await` : le serveur accepte les connexions
avant la fin. Les tout premiers tours peuvent donc etre lents ou partir en
timeout tant que `pret en` n'est pas affiche.

---

## 5. Configurer une partie — `requirements/game/app/game/config.js`

```js
export const gameConfig = {
	bots: ['local_agent', 'local_agent', 'local_agent'],
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
`mistral_small` (API Mistral, cle requise) et `local_agent` (ollama).
On peut melanger, par exemple `['local_agent', 'mistral_small']`.

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
