# AImpostor — Plan de route : cycle de vie des rooms

**Document de travail.** Arbitrages validés et découpage en étapes.
Complète [ROOM_LIFECYCLE_TODO.md](ROOM_LIFECYCLE_TODO.md), qui reste la
référence pour l'architecture et les pièges. Ce document-ci dit **quoi faire,
dans quel ordre, et ce qu'on a décidé de ne pas faire**.

Dernière mise à jour : 5 septembre 2026.

---

## 1. Arbitrages validés

### A1 — Le jeu reste jouable sans compte

On ne conditionne pas la partie à une authentification. Combiné à A2, cela
signifie qu'il n'y a **aucun mécanisme d'identité** dans le service de jeu :
`playerId` reste un compteur serveur, comme aujourd'hui.

### A2 — On ne gère aucune reconnexion

Décision structurante du lot. On part du principe que le réseau est stable et
que le cas courant ne comporte pas de coupure.

**Toute perte de socket est définitive.** Coupure réseau, rafraîchissement de
page, fermeture d'onglet : dans les trois cas, le joueur quitte la partie et
ne peut pas récupérer sa place.

*Pourquoi : la reconnexion demande une identité stable côté client, un délai
de grâce côté serveur, une reprise de socket, et surtout une
resynchronisation complète de l'état (personnage, historique, tour courant,
votes). C'est la plus grosse charge du dossier pour un gain qui ne se
manifeste que dans les cas rares. On préfère un lot simple et solide.*

Conséquence à afficher clairement côté front : **rafraîchir la page pendant
une partie fait perdre sa place.**

### A3 — Abandonné : identité de session

*Cet arbitrage prévoyait un `sessionId` en mémoire côté client pour survivre
aux coupures réseau courtes. Il est **abandonné** avec A2 : sans reconnexion,
l'identité de session n'a plus d'usage. Le code correspondant a été retiré.*

*Conservé ici pour mémoire, avec le point de conception à ne pas oublier si le
sujet revenait un jour : un jeton de session ne doit **jamais** devenir
`player.id`, car `endGame` et `endRound` diffusent les `playerId` à tous les
joueurs (voir B8). Ce seraient deux champs distincts.*

### A4 — Seuil de continuation distinct du seuil de démarrage

`minPlayers` sert à **démarrer**. Le réutiliser pour **continuer** rend une
partie mortelle au premier départ.

```js
minPlayers: 3,             // pour DEMARRER
minPlayersToContinue: 3,   // pour CONTINUER une partie lancee
```

**À arbitrer avec les réglages actuels** (`minPlayers: 3`, un seul bot) : une
partie démarre donc à 2 humains. En perdre un laisse 1 humain face à 1 bot,
où le vote n'a plus de sens. Avec cette configuration, `minPlayersToContinue`
égal à `minPlayers` est défendable : **toute déconnexion annule la partie**.
Si l'effectif remonte (`minPlayers: 4` et plus), un seuil de continuation plus
bas redevient intéressant.

Le comptage porte sur `players.size` (bot inclus, voir piège 1 du TODO).

### A5 — Un silence est toujours de durée identique

Ne **jamais** raccourcir un tour resté muet. Si un silence pouvait durer moins
que `turnDuration` dans certains cas, sa durée deviendrait un signal — et le
bot, quand son LLM traîne ou échoue, est justement un joueur muet. Ce serait
un canal auxiliaire désignant l'IA, en violation de la règle n°1.

Une **déconnexion**, elle, est annoncée ouvertement (voir §6) : ce n'est pas
une information secrète, et le tour d'un joueur parti peut donc être clos
immédiatement sans rien trahir.

### A6 — Une file d'attente, pas un lobby riche

`findOrCreateRoom` remplit les rooms dans l'ordre d'arrivée : quatre amis qui
lancent une partie ensemble atterrissent dans la même room. L'architecture
actuelle *garantit* le scénario que le jeu doit éviter.

La file d'attente est l'endroit où brancheront les règles anti-affinité (pas
d'amis ensemble, pas la même IP, pas deux entrées à quelques ms d'intervalle).
Le lobby n'affiche qu'un compteur : aucune information, aucune communication
entre joueurs avant le début.

Bénéfice secondaire : la Room naît avec son roster définitif, donc `isFull()`,
`canStart()`, le statut `waiting` et le compte à rebours de démarrage
disparaissent de Room. Le cycle devient `créée -> en jeu -> détruite`.

---

## 2. Hors périmètre

À ne pas implémenter dans ce lot, mais à ne pas rendre impossible :

- **Toute forme de reconnexion** : identité de session, délai de grâce,
  reprise de socket, snapshot de resynchronisation (A2, A3).
- **Rattachement d'une partie à un compte** (stats, historique).
- **Règles anti-affinité** dans la file d'attente : on pose l'emplacement,
  pas les règles.
- **Heartbeat ping/pong** — optionnel, voir §7.

---

## 3. Étapes

Un commit, une intention. Chaque étape est testable indépendamment.

| # | Étape | Contenu | État |
|---|---|---|---|
| 1 | `destroy()` + registre | O1 + O2 du TODO. Ordre strict : broadcast -> clearInterval (room puis round) -> retrait de la Map. Corrige B1 et B3. | **fait** (`eb55021`) |
| 2 | Retrait propre du Round | O4 + piège 2. Approche retenue : **marquer plutôt que retirer**. `turnOrder`, `playerById` et `assignments` restent intacts ; un `Set leftPlayers` décide qui joue. Corrige B6, rend B4 et B5 sans objet. | **fait** |
| 3 | Notification au front | `playerDisconnected` par **nom de personnage**, jamais par `playerId`. | à faire |
| 4 | Quorum de continuation | `minPlayersToContinue` (A4). Sous le seuil : `destroy('not_enough_players')`. | à faire |
| 5 | Rooms orphelines | O5. Attention : `players.size === 0` n'arrive jamais, le bot ne se déconnecte pas. | à faire |
| 6 | État « fermée » | O3. Une partie lancée n'accepte plus personne. | à faire |
| 7 | File d'attente | Remplace `findOrCreateRoom` (A6). Permet le retour au lobby en fin de partie. | à faire |
| 8 | Documentation | Protocole WebSocket dans `BACKEND.MD` et `FRONTEND.MD`. | à faire |

L'étape 2 est la plus délicate du lot : c'est elle qui contient les pièges.

---

## 4. Bugs à corriger au passage

Relevés à la lecture, en plus des pièges du TODO.

| # | Où | Problème | Étape |
|---|---|---|---|
| B1 | `room.js` `endGame()` | Ne détruisait pas la room. Une partie terminée pouvait recevoir un nouveau joueur. | **fait** |
| B2 | `room.js` `removePlayer()` | Remet le statut à `waiting` pendant un scoreboard : `timerId` sert à deux usages. | 4 |
| B3 | `room.js` `numberOfPlayer` | Champ maintenu à la main, décrémenté même pour un joueur absent. | **fait** |
| B4 | `round.js` `endRound()` | `players.find(p => p.agentName)` déréférencé sans garde. **Sans objet** : `this.players` n'est jamais modifié, chaque room reçoit un bot à sa création, et un bot ne se déconnecte jamais. | — |
| B5 | `round.js` `startTurn()` | `playerById.get()` déréférencé sans garde. **Sans objet** depuis l'étape 2 : `playerById` et `turnOrder` ne sont jamais modifiés, donc la recherche aboutit toujours. C'est l'avantage principal de « marquer plutôt que retirer ». | — |
| B6 | `round.js` constructeur | `humanPlayers` et `expectedVotes` figés à la construction : un joueur parti restait compté dans les scores. | **fait** |
| B7 | `main.tsx` `<StrictMode>` | Double-monte les effets en dev : la socket est ouverte, fermée, rouverte. Produit de fausses déconnexions en développement. | — |
| B8 | `room.js` `endGame()`, `round.js` `endRound()` | Diffusent les `playerId` à tous les joueurs, contre la règle n°1 du TODO. Cosmétique aujourd'hui (`joueur-3`), mais interdit toute idée de rendre `player.id` secret. | 8 |
| B9 | `player.js` | `this.isAI = false` ignore le paramètre reçu ; rien ne lit ce champ, tout le code teste `agentName`. Champ mort et faux. | — |

**Principe retenu : on ne code pas de garde contre un état impossible.** B4 et
B5 le sont devenus grâce au choix de conception de l'étape 2, pas grâce à des
`if` défensifs. Une garde sur un cas inatteignable est du code mort : elle
alourdit la lecture et laisse croire que le cas peut survenir.

---

## 5. Configuration

```js
// game/config.js
roomCloseDelayMs: 10000,    // ms : lecture du classement avant destruction  [fait]
minPlayersToContinue: 3,    // quorum de continuation (A4)                   [etape 4]
```

---

## 6. Protocole — nouveaux messages

Toujours par **nom de personnage**, jamais par `playerId`. Le `code` est une
chaîne machine : le front choisit le texte et la langue.

| Message | Sens | Étape |
|---|---|---|
| `{ type:'roomClosed', code }` | La room ferme. Codes : `game_finished`, `not_enough_players`, `agent_failure` | 1 (émis, pas encore traité par le front) |
| `{ type:'playerDisconnected', character }` | Un joueur a quitté la partie | 3 |
| `{ type:'queue', waiting }` | Lobby : uniquement un compteur | 7 |

**Le front ignore encore `roomClosed`** : la liste blanche de
`gameSocket.ts` filtre les types inconnus, donc le message part du serveur
mais n'atteint jamais `Game.tsx`. À traiter à l'étape 8.

---

## 7. Optionnel : heartbeat ping/pong

Une socket tuée brutalement (mise en veille, wifi coupé, machine éteinte) ne
produit **pas** d'événement `close` : il n'y a pas de handshake de fermeture.
Le TCP keepalive de Linux met environ deux heures à s'en apercevoir. Le joueur
reste alors dans la room, compte dans le quorum, et ne répond jamais.

Sous l'hypothèse d'un réseau stable et d'un usage normal (on ferme son
onglet), `close` est fiable et ce cas reste rare — d'où le classement en
optionnel. À garder en tête si des joueurs fantômes apparaissent en test.

Le pattern existe déjà dans le projet : `presence.gateway.ts` du backend
NestJS utilise un `isAlive` avec ping/pong. Environ 15 lignes.
