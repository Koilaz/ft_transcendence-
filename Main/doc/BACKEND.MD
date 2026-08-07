# Backend — documentation technique

Etat du code au 7 aout 2026. Document de passation : ce qui existe, comment
c'est cable, et ce qui manque.

Pour lancer et configurer la stack, voir [README_TMP.md](README_TMP.md).

---

## 1. Vue d'ensemble

Six containers sur le reseau bridge `transcendence`. Nginx est le seul point
d'entree expose (443 dans le container, `NGINX_PORT` sur l'hote).

```
                        Navigateur
                            │ HTTPS / WSS
                            ▼
                          nginx
        ┌───────────┬───────┴────────┬──────────────┐
        │           │                │              │
   frontend      backend           game          /uploads/
   (Vite)       (NestJS)      (Node + ws)      (volume disque)
                    │                │
               postgres            ollama
```

**Il y a deux backends distincts, et c'est volontaire :**

| Service | Stack | Role | Etat |
|---|---|---|---|
| `backend` | NestJS 10 + TypeScript + Prisma + PostgreSQL | comptes, profils, amis, presence | fonctionnel |
| `game` | Node 22 + Express + `ws`, JavaScript pur | boucle de jeu AImpostor, agents LLM | fonctionnel sauf le vote |

Le service `game` ne partage **rien** avec le NestJS : pas de base de donnees,
pas d'authentification, pas de code commun. Tout son etat est en memoire et
disparait au redemarrage.

### Routage nginx — `requirements/nginx/conf/nginx.conf`

| Route | Destination | Remarque |
|---|---|---|
| `/uploads/` | `alias /app/uploads/` | volume `uploads_data`, monte en lecture seule |
| `/ws/presence` | `backend:3000` | pas de slash final : le gateway filtre sur `pathname === '/ws/presence'`, il doit recevoir l'URI intacte |
| `/ws/game` | `game:3000` | idem, headers `Upgrade`/`Connection` |
| `/api/` | `backend:3000` | le NestJS a un prefixe global `api` |
| `/` | `frontend:5173` | fourre-tout, headers `Upgrade` necessaires au HMR de Vite |

`client_max_body_size 2M` correspond exactement a la limite multer des avatars.

**Masquage du JWT dans les logs.** Les WebSockets transportent leur token en
query string (l'API WebSocket du navigateur interdit un header `Authorization`).
Un `map` + un `log_format masked` remplacent `token=...` par `token=REDACTED`
dans `access.log`. Deux limites documentees dans le fichier : seule la derniere
occurrence de `token=` est masquee, et `error_log` n'est pas couvert.

---

## 2. Service `backend` (NestJS)

### 2.1 Amorcage — `src/main.ts`

```ts
app.enableShutdownHooks();
app.setGlobalPrefix('api');
app.enableCors();
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true,
}));
await presenceGateway.attach(app.getHttpServer());
await app.listen(3000, '0.0.0.0');
```

Points a connaitre :

- **Prefixe global `api`** : toutes les routes du code sont montees sous `/api`.
  `@Controller('auth')` donne `/api/auth`.
- **`ValidationPipe` strict** : `forbidNonWhitelisted` renvoie 400 des qu'un
  champ non declare dans le DTO est present. Ajouter un champ cote client sans
  l'ajouter au DTO casse la requete.
- **Le gateway de presence est attache a la main** au serveur HTTP brut, pas via
  `@nestjs/websockets`. Voir section 2.6.
- `enableCors()` sans argument : **toutes les origines sont acceptees**.

### 2.2 Modules

| Module | Contenu |
|---|---|
| `PrismaModule` | `PrismaService` (`$connect` / `$disconnect` sur le cycle de vie Nest), exporte globalement au module |
| `UsersModule` | `UsersService`, `UsersController` |
| `AuthModule` | `AuthService`, `AuthController`, `JwtStrategy`, `JwtAuthGuard`, `JwtModule` (secret depuis `JWT_SECRET`, `expiresIn: '1h'`) |
| `FriendsModule` | `FriendsService`, `FriendsController` |
| `PresenceModule` | `PresenceGateway`, `PresenceService` |
| `AppController` | `GET /api/health` |

### 2.3 Modele de donnees — `prisma/schema.prisma`

```
User                              Friendship
──────────────────────────        ──────────────────────────────
id            Int  @id            id           Int @id
username      String @unique      requesterId  Int → User
email         String @unique      receiverId   Int → User
passwordHash  String              status       PENDING | ACCEPTED
avatarUrl     String?             createdAt / updatedAt
isOnline      Boolean @default    @@unique([requesterId, receiverId])
lastSeenAt    DateTime?           onDelete: Cascade des deux cotes
createdAt / updatedAt
```

Tables PostgreSQL : `users` et `friendships` (via `@@map`).

Une amitie est **une seule ligne**, pas deux : les requetes doivent donc
toujours tester `requesterId = X OR receiverId = X`, et le service traduit
ensuite en « l'ami, c'est l'autre colonne ». C'est fait dans
`FriendsService.getFriends()` et `PresenceService.getAcceptedFriendIds()`.

Trois migrations dans `prisma/migrations/` : `init_users`, `add_friendships`,
`add_user_presence`. Elles sont appliquees au demarrage par l'entrypoint avec
`npx prisma migrate deploy` (jamais `migrate dev` en container).

### 2.4 Selections de champs

`UsersService` definit deux projections, et **`passwordHash` n'est dans aucune
des deux** :

| Projection | Champs | Usage |
|---|---|---|
| `publicUserSelect` | id, username, avatarUrl, isOnline, lastSeenAt, createdAt | listes d'utilisateurs, amis |
| `privateUserSelect` | + email, updatedAt | profil de l'utilisateur connecte |

Exception : `findByUsername` et `findByEmail` renvoient la ligne complete,
`passwordHash` compris. Elles sont internes a l'inscription et la connexion —
ne jamais renvoyer leur resultat tel quel dans une reponse HTTP.

### 2.5 Authentification

**Inscription** (`AuthService.register`) : verifie username puis email, hash
bcrypt cout 12, `create`. Le `P2002` de Prisma est rattrape en plus des
verifications explicites, pour couvrir la course entre deux inscriptions
simultanees.

**Connexion** (`AuthService.login`) : recherche par email, `bcrypt.compare`,
puis signature du JWT. Le meme message `Invalid credentials` est renvoye que
l'email soit inconnu ou le mot de passe faux — pas d'oracle sur l'existence
d'un compte.

**Payload JWT** : `{ sub: user.id, username }`, `expiresIn: '1h'`.

**`JwtStrategy`** : token extrait du header `Authorization: Bearer`,
`ignoreExpiration: false`, secret lu dans `process.env.JWT_SECRET` (throw au
demarrage s'il manque). `validate()` expose `{ userId, username }` sur
`request.user`.

Ce qui **n'existe pas** : refresh token, deconnexion cote serveur, liste de
revocation, 2FA. Un token vole reste valable une heure.

### 2.6 API REST

| Methode | Route | Auth | Corps | Reponse |
|---|---|---|---|---|
| GET | `/api/health` | — | — | `{ status, service }` |
| GET | `/api/users` | **aucune** | — | `PublicUser[]`, tries par username |
| POST | `/api/auth/register` | — | `RegisterDto` | utilisateur (projection privee) |
| POST | `/api/auth/login` | — | `LoginDto` | `{ accessToken, user }` |
| GET | `/api/auth/me` | JWT | — | utilisateur (projection privee) |
| PATCH | `/api/auth/me` | JWT | `UpdateProfileDto` | utilisateur, 409 si username pris |
| PATCH | `/api/auth/me/avatar` | JWT | multipart, champ `avatar` | utilisateur |
| POST | `/api/friends/:userId` | JWT | — | la `Friendship` creee |
| PATCH | `/api/friends/:userId/accept` | JWT | — | la `Friendship` acceptee |
| DELETE | `/api/friends/:userId` | JWT | — | `{ message }` |
| GET | `/api/friends` | JWT | — | `{ id, friend, createdAt, updatedAt }[]` |
| GET | `/api/friends/requests` | JWT | — | demandes **recues** en attente |
| GET | `/api/friends/sent-requests` | JWT | — | demandes **envoyees** en attente |

**Regles de validation des DTO**

| DTO | Champ | Regles |
|---|---|---|
| `RegisterDto` | username | trim, 3–20, `^[a-zA-Z0-9_]+$` |
| | email | trim + lowercase, `IsEmail` |
| | password | 8–100 |
| `LoginDto` | email | trim + lowercase, `IsEmail` |
| | password | 8–100 |
| `UpdateProfileDto` | username | optionnel, memes regles que l'inscription |

Le controleur `PATCH /auth/me` rejette en plus un username vide apres trim
(400), donc le champ est en pratique obligatoire malgre l'`@IsOptional()`.

**Erreurs metier de `FriendsService`** : self-add (400), utilisateur inconnu
(404), deja amis (409), demande deja envoyee (409), demande deja recue dans
l'autre sens (409, message different pour guider le client vers `accept`).

**Upload d'avatar** : multer `diskStorage` vers `/app/uploads/avatars`, nom de
fichier `randomUUID()` + extension deduite du mimetype, limite 2 Mo, mimetypes
autorises `image/jpeg`, `image/png`, `image/webp`. L'URL stockee en base est
`/uploads/avatars/<fichier>` — un chemin relatif, servi par nginx depuis le
volume partage. Les anciens avatars ne sont **jamais supprimes**.

### 2.7 WebSocket de presence — `/ws/presence`

`PresenceGateway` n'utilise pas `@nestjs/websockets`. Il s'accroche au serveur
HTTP brut dans `main.ts` et gere lui-meme l'evenement `upgrade`.

**Handshake**

1. Filtre `url.pathname !== '/ws/presence'` → 404 brut + `socket.destroy()`.
2. Token cherche dans `Authorization: Bearer`, **sinon** dans `?token=`. En
   pratique c'est toujours la query string, le navigateur ne pouvant pas poser
   de header sur une WebSocket. D'ou le masquage dans les logs nginx.
3. `jwtService.verifyAsync` + `Number.isInteger(payload.sub)` → sinon 401 brut.
4. `handleUpgrade` puis `emit('connection')` avec `userId` et `isAlive` poses
   sur la socket.

**Etat en memoire**

```ts
userSockets: Map<number, Set<AuthenticatedWebSocket>>
```

Un utilisateur peut avoir plusieurs onglets. La base ne bascule `isOnline` a
`true` qu'a **la premiere** socket, et a `false` qu'a **la derniere** fermeture.
`lastSeenAt` est mis a `null` en ligne, horodate hors ligne.

**Nettoyage** : `setAllUsersOffline()` est appele a l'attache **et** a
`onModuleDestroy`. C'est ce qui evite les utilisateurs coinces « en ligne »
apres un crash ou un redemarrage.

**Heartbeat** : `ping` toutes les 30 s, `terminate()` si le `pong` precedent
n'est pas revenu.

**Messages emis** (le serveur n'ecoute rien, le canal est unidirectionnel) :

| Type | Destinataire | Charge |
|---|---|---|
| `presence:connected` | le client qui vient de se connecter | `{ userId, isOnline: true }` |
| `presence:update` | uniquement les amis **acceptes** | `{ userId, isOnline, lastSeenAt }` |

---

## 3. Service `game`

Container independant. Node 22, Express (sert `public/`, marque `#tmp`),
`WebSocketServer` sur le chemin `/ws/game`.

### 3.1 Demarrage — `app/server.js`

```js
await checkAllAgents();                 // etat des agents, aucun token consomme
server.listen(3000, ...);
warmupOllama().catch(...);              // sans await : ne bloque pas le demarrage
```

A chaque connexion WebSocket : `findOrCreateRoom()`, puis un `playerId` du type
`joueur-N` issu d'un compteur global.

> **Aucune authentification.** N'importe quelle connexion a `/ws/game` devient
> un joueur. Le service ignore tout des comptes du NestJS. C'est le principal
> chantier d'integration restant.

### 3.2 Objets

| Objet | Fichier | Role | Duree de vie |
|---|---|---|---|
| `Room` | `game/room.js` | joueurs, historique, suite des manches | toute la partie |
| `Round` | `game/round.js` | une manche : personnages, ordre de jeu, tours | une manche |
| `Player` | `game/player.js` | identite persistante (humain ou IA) | toute la room |

`CARACTERS` (dans `room.js`) : Colonel Moutarde, Major Wasabi, Caporal Mayo,
Lieutenant Samourai, General Ketchup, Marechal Cocktail.

### 3.3 Cycle de vie d'une room

```
addPlayer
   ├─ players.size >= minPlayers && status 'waiting' → launchStartTimer(startingTimer)
   └─ isFull()                                        → startNewRound()

launchStartTimer : setInterval 1 s, broadcastState a chaque tick,
                   a 0 → startNewRound()

startNewRound : roundNumber++, status 'playing',
                new Round(joueurs, broadcast, addSystemMessage), round.start()
```

`findOrCreateRoom()` renvoie la premiere room non pleine, sinon en cree une et
appelle `addBots()`, qui lit `gameConfig.bots` (un agent par entree, arret si la
room est pleine).

### 3.4 Cycle de vie d'une manche

```
Round.start()
   ├─ notifyAssignments()        → 'assignment' prive a chaque joueur
   ├─ turnCycle = turnPerRound
   └─ startTurn()

startTurn()
   ├─ 'yourTurn' au joueur courant seulement
   ├─ 'turn' en broadcast
   └─ setInterval 1 s : countdown--, broadcastTurn, a 0 → onTurnTimeout()

Fin de tour, course entre deux evenements :
   A. onPlayerMessage(playerId)  ← le joueur courant a parle
   B. onTurnTimeout()            ← le chrono a expire ('silence' + message systeme)
   Les deux passent par endTurn(), qui annule le timer du perdant.

advanceTurn()
   turnIndex++ → si fin du tour de table : turnIndex = 0, turnCycle--
                 si turnCycle <= 0        : startVotingPhase()
```

`Round.assignCaracters()` melange `CARACTERS` et en prend autant que de joueurs.
`assignTurnOrder()` melange les `playerId`. Les deux sont retires a chaque
manche.

### 3.5 La regle du secret

> **Aucun message envoye au client ne doit permettre de deduire quel joueur est
> le bot.**

Concretement, applique dans le code existant :

- `Round.assignments` (playerId → personnage) ne quitte jamais le serveur.
- `broadcastTurn()` envoie `this.caracterOf(...)`, **jamais** un `playerId`.
- `Room.addMessage()` pousse dans l'historique `{ sender: character, text }`.
- `publicTurnOrder()` traduit l'ordre de jeu en noms de personnages.

Trois niveaux d'information : **public** (`broadcast`), **prive**
(`player.send`), **secret serveur** (`assignments`, la nature IA d'un joueur).
Verifier chaque objet passe a `broadcast` — c'est la fuite la plus facile a
commettre. Details dans [Game/VOTING_TODO.md](Game/VOTING_TODO.md).

### 3.6 Protocole WebSocket `/ws/game`

**Serveur → client**

| Type | Portee | Charge | Emis quand |
|---|---|---|---|
| `state` | broadcast | `{ status, players, room_number, countdown }` | tout changement de room, et chaque seconde du compte a rebours de depart |
| `assignment` | prive | `{ character }` | debut de manche |
| `turn` | broadcast | `{ character, turnOrder[], turnCycle, countdown }` | chaque seconde du tour |
| `yourTurn` | prive | `{ countdown }` | debut du tour du joueur |
| `chat` | broadcast | `{ sender, text }` | message accepte (`sender` = personnage) |
| `silence` | broadcast | `{ character }` | le joueur n'a pas parle a temps |
| `roundState` | broadcast | `{ status }` | entree en phase de vote |

**Client → serveur**

| Type | Charge | Traitement |
|---|---|---|
| `chat` | `{ text }` | **seul type accepte.** Tout le reste est logge et ignore |

Il n'y a pas de message `join` : le serveur assigne la room a l'ouverture de la
socket.

Un message n'est accepte que si `currentRound.status === 'chatting'` **et**
`canSpeak(sender)`, c'est-a-dire que l'emetteur est bien le joueur du tour. Le
serveur est autoritaire, le client ne fait jamais avancer un tour.

### 3.7 Couche agents — `app/agents/`

Contrat commun : `{ name, generate(history, additionalContext), healthCheck() }`.
`healthCheck()` ne throw jamais et renvoie toujours `{ ok, detail }`.

| Fichier | Role |
|---|---|
| `index.js` | registre des agents, `generateReply()`, `checkAllAgents()` |
| `prompt.js` | `buildSystemPrompt()`, partage par **tous** les agents |
| `mistral_common.js` | `createMistralAgent({ name, model })` + les trois agents API |
| `ollama_local.js` | agent local, warmup, metriques |

Agents enregistres : `mistral_medium` (mistral-medium-3.5), `mistral_big`
(mistral-large-latest), `mistral_small` (mistral-small-latest),
`mistral_7B_local` (ollama).

**Agents Mistral** : `POST https://api.mistral.ai/v1/chat/completions`,
`temperature 0.85`, `max_tokens 70`. Cle lue par l'entrypoint depuis
`/run/secrets/mistral_api_key.txt` et exportee en `MISTRAL_API_KEY`.
`healthCheck` liste `/v1/models` sans consommer de token. Sur 429, les entetes
de quota sont logges pour distinguer notre limite du pool partage du palier.

**Agent local** : `POST /api/chat` sur `OLLAMA_URL`, non streame,
`keep_alive: '30m'`. Timeout `(turnDuration - 0.5) s`. Deux points de conception
a ne pas casser :

- **`num_ctx` est un parametre de chargement.** Ollama decharge et recharge le
  modele s'il change d'un appel a l'autre. Le warmup et les appels de jeu
  doivent envoyer les memes options.
- **L'ordre du prompt est impose par le cache KV.** Message systeme (fixe) →
  contexte partage de la manche → transcript (qui ne grandit que par la fin) →
  contexte du bot (personnage, heure) → consigne. Deplacer un bloc variable vers
  le debut fait repayer l'integralite du prefill a chaque tour. Les metriques
  `[ollama] prefill … | decode …` servent a le verifier, voir README_TMP.md § 6.

**Comportement d'un bot** — `game/bot.js` : `createBotSendFn(room, botId,
agentName)` renvoie un `sendFn` qui ne reagit qu'aux messages `yourTurn`. Un
delai aleatoire imite une frappe humaine, et peut volontairement depasser le
tour pour que le bot reste parfois muet. Disjoncteur : 3 echecs consecutifs et
l'agent est considere mort, on ne l'appelle plus. Les erreurs `fatal`
(401/402/403/404 : auth, quota, modele introuvable) tuent l'agent immediatement
puisque reessayer ne sert a rien.

`add_context()` renvoie `{ shared, perBot }` : `shared` est identique pour tous
les bots de la manche, `perBot` change a chaque appel. Le decoupage existe pour
le cache KV de l'agent local ; les agents distants recollent simplement les deux.

---

## 4. Secrets, variables et amorcage des containers

| Secret | Lu par | Devient |
|---|---|---|
| `postgres_password.txt` | postgres, backend | `PGPASSWORD`, et la partie mot de passe de `DATABASE_URL` |
| `jwt_secret.txt` | backend | `JWT_SECRET` |
| `mistral_api_key.txt` | game | `MISTRAL_API_KEY` |

Les secrets sont montes en lecture seule sur `/run/secrets` et lus par les
entrypoints avec `tr -d '\n'`. Ils ne transitent jamais par le `.env`.

**Entrypoint backend** : construit `DATABASE_URL`, cree
`/app/uploads/avatars`, **attend PostgreSQL avec un vrai `psql -c "SELECT 1"`**
et pas un simple test de port — le 5432 est ouvert pendant le demarrage
temporaire de postgres, un `nc` passerait trop tot. Puis
`npx prisma migrate deploy` et `npm run start:prod`.

**Dockerfile backend** : `prisma generate` est lance au build avec une
`DATABASE_URL` bidon, car le client Prisma doit etre genere avant le
`npm run build` alors que la vraie URL n'existe qu'au runtime.

---

## 5. Etat actuel et travaux restants

### Bloquants fonctionnels

1. **La phase de vote n'existe pas.** `Round.startVotingPhase()` passe le statut
   a `voting`, diffuse `roundState` et s'arrete sur un `console.log`. Rien n'est
   collecte, rien n'est depouille, la manche ne se termine jamais. Cahier des
   charges detaille dans [Game/VOTING_TODO.md](Game/VOTING_TODO.md) et
   [Game/VOTING_PHASE.md](Game/VOTING_PHASE.md).
2. **Le service `game` n'est relie ni aux comptes ni a la base.** Pas de JWT sur
   `/ws/game`, les joueurs sont des `joueur-N` anonymes, aucun resultat de
   partie n'est persiste.
3. **Les deconnexions en cours de manche ne sont pas gerees**
   (`#TODO geree les deconnection proprement`, en tete de `room.js`).
   `removePlayer()` retire le joueur de la Map de la room mais ne touche pas au
   `Round` en cours : son `playerId` reste dans `turnOrder`, et `startTurn()`
   finira par appeler `send()` sur une socket morte.
4. **Les rooms ne sont jamais detruites.** La Map `rooms` de `room.js` ne fait
   que grandir. Voir [Game/ROOM_LIFECYCLE_TODO.md](Game/ROOM_LIFECYCLE_TODO.md).

### Pieges dans le code existant

- **`Player.IsAI` vaut toujours `false`.** Le constructeur destructure bien
  `{ isAI = false }` mais assigne ensuite le litteral `false`, et le champ n'a
  pas la meme casse que l'option. Personne ne le lit aujourd'hui, mais c'est un
  piege pose pour plus tard. `this.currentCaractere;` juste au-dessus est une
  expression sans effet.
- **`GET /api/users` n'est pas protege** et liste tous les comptes.
- **`enableCors()` accepte toutes les origines.**
- **Aucun refresh token.** Le JWT expire au bout d'une heure et le client n'a
  aucun moyen de le renouveler autrement qu'en se reconnectant.
- **Les anciens avatars ne sont jamais supprimes** du volume.
- **`dist/` est commite** cote backend comme cote frontend. Les images
  reconstruisent de toute facon, ces dossiers sont du bruit potentiellement
  perime.
- **Aucun test**, nulle part.

### Ordre de travail suggere

1. Authentifier `/ws/game` avec le meme JWT que la presence — le
   `PresenceGateway` fournit un modele de handshake directement reutilisable
   (verification du token, rejet en HTTP brut, `Map<userId, Set<socket>>`).
2. Gerer proprement la deconnexion dans `Round`.
3. Implementer la phase de vote.
4. Persister les resultats de partie (nouvelle table + migration).
