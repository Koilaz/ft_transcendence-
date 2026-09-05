# AImpostor — Plan de route : cycle de vie des rooms

**Document de travail.** Arbitrages validés et découpage en étapes.
Complète [ROOM_LIFECYCLE_TODO.md](ROOM_LIFECYCLE_TODO.md), qui reste la
référence pour l'architecture et les pièges. Ce document-ci dit **quoi faire,
dans quel ordre, et ce qu'on a décidé de ne pas faire**.

Dernière mise à jour : 5 septembre 2026.

---

## 1. Arbitrages validés

### A1 — Le jeu reste jouable sans compte

On ne conditionne pas la partie à une authentification. Un invité joue comme
un joueur connecté, avec **la même politique de déconnexion**. Une seule
identité, un seul chemin de code :

```js
playerId = sessionId   // genere cote client, identique pour invite et connecte
```

Un JWT pourra plus tard être transmis **en plus**, pour rattacher une partie à
un profil (stats, historique). Il ne remplacera pas `sessionId` : ce sont deux
notions différentes (qui tu es / quelle place tu occupes).

*Pourquoi pas deux politiques (connecté = reconnexion, invité = kick) : la
partie coûteuse de la reconnexion est la resynchronisation, et elle est
identique dans les deux cas. Séparer n'économise rien et double les chemins de
code, les politiques et les tests.*

### A2 — On gère la coupure réseau, pas le rafraîchissement

C'est la décision structurante du lot.

| Cas | Contexte JS | État React | Traité ? |
|---|---|---|---|
| Coupure réseau courte | vivant | intact | **oui** — il suffit de rebrancher la socket |
| Rafraîchissement de page | détruit | perdu | **non** — demanderait un snapshot complet |

Un refresh en cours de partie fait donc **perdre sa place**. C'est un
comportement assumé, à afficher clairement côté front.

*Pourquoi : la coupure réseau est subie, le refresh est volontaire. Le premier
ne demande aucune resynchronisation puisque le client a gardé son état en
mémoire ; le second demande de tout reconstruire. On traite le cas subi et on
documente l'autre.*

### A3 — L'identité vit en mémoire, pas dans un stockage persistant

```ts
// portee module : meurt avec le contexte JS
const sessionId = crypto.randomUUID();
```

**Ne pas utiliser `sessionStorage`, `localStorage` ni de cookie.** Tous les
trois survivent au rafraîchissement : le joueur reviendrait avec la même
identité, récupérerait sa place, et se retrouverait devant une interface vide
(ni personnage, ni historique). Une variable en mémoire a exactement la bonne
durée de vie — elle *est* la frontière entre récupérable et non récupérable.

### A4 — Seuil de continuation distinct du seuil de démarrage

`minPlayers` sert à **démarrer**. Le réutiliser pour **continuer** rend une
partie mortelle au premier départ : avec `minPlayers: 4` et 1 bot, une partie
démarre à 3 humains et mourrait dès qu'un seul s'en va.

```js
minPlayers: 4,             // pour DEMARRER
minPlayersToContinue: 3,   // pour CONTINUER une partie lancee
```

Le comptage porte sur les joueurs **connectés**, pas sur `players.size` : un
joueur en délai de grâce est encore dans la Map mais ne joue pas.

### A5 — Un silence est toujours de durée identique

Ne **jamais** raccourcir le tour d'un joueur déconnecté. Si un déconnecté est
sauté instantanément alors qu'un silence normal dure 10 s, « silencieux
pendant 10 s » devient un signal distinctif — et le bot, quand son LLM traîne
ou échoue, est précisément dans ce cas. Ce serait un canal auxiliaire
désignant l'IA, en violation de la règle n°1.

Déconnecté, muet, ou bot en panne doivent produire le **même** `silence`, au
**même** moment.

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

- **Snapshot / resynchronisation complète** (voir A2). Les étapes 2 et 3
  ci-dessous en sont les prérequis : l'ajouter plus tard ne demandera aucune
  réécriture.
- **Rattachement d'une partie à un compte** (stats, historique).
- **Règles anti-affinité** dans la file d'attente : on pose l'emplacement,
  pas les règles.

---

## 3. Étapes

Un commit, une intention. Chaque étape est testable indépendamment.

| # | Étape | Contenu |
|---|---|---|
| 1 | `destroy()` + registre | O1 + O2 du TODO. Ordre strict : broadcast -> clearInterval (room puis round) -> retrait de la Map. Corrige B1. |
| 2 | Identité de session | `sessionId` en mémoire côté client, passé en query param. Un seul chemin invité/connecté (A1, A3). |
| 3 | Heartbeat + grâce + retry | Ping/pong serveur, délai de grâce, reconnexion automatique côté client. Couvre A2. |
| 4 | Retrait propre du Round | O4 + piège 2. Corrige B4, B5, B6. |
| 5 | Quorum de continuation | `minPlayersToContinue` sur les connectés (A4). |
| 6 | État « fermée » | O3. Une partie lancée n'accepte plus personne. |
| 7 | File d'attente | Remplace `findOrCreateRoom` (A6). |
| 8 | Documentation | Protocole WebSocket dans `BACKEND.MD` et `FRONTEND.MD`. |

L'étape 3 est celle qui délivre la valeur visible. L'étape 1 est le socle :
tout le reste s'appuie dessus.

---

## 4. Bugs à corriger au passage

Relevés à la lecture, en plus des pièges du TODO.

| # | Où | Problème | Étape |
|---|---|---|---|
| B1 | `room.js` `endGame()` | Ne détruit pas la room. Une partie terminée peut recevoir un nouveau joueur. | 1 |
| B2 | `room.js` `removePlayer()` | Remet le statut à `waiting` pendant un scoreboard : `timerId` sert à deux usages. | 5 |
| B3 | `room.js` `numberOfPlayer` | Champ mort maintenu en parallèle de `players.size`, décrémenté même si absent. | 1 |
| B4 | `round.js` `endRound()` | `players.find(p => p.agentName)` déréférencé sans garde -> crash du process. | 4 |
| B5 | `round.js` `startTurn()` | `playerById.get()` déréférencé sans garde. Inoffensif aujourd'hui, devient un crash dès qu'on retire un joueur du Round. | 4 |
| B6 | `round.js` constructeur | `humanPlayers` et `expectedVotes` figés à la construction. | 4 |
| B7 | `main.tsx` `<StrictMode>` | Double-monte les effets en dev : la socket est ouverte, fermée, rouverte. Produit de fausses déconnexions en développement. | — |

**B5 et B7 sont ceux qui font perdre du temps si on ne les a pas en tête.**

---

## 5. Configuration à prévoir

```js
// game/config.js
roomCloseDelayMs: 10000,    // lecture du scoreboard avant destruction
disconnectGraceMs: 15000,   // delai avant kick definitif
heartbeatIntervalMs: 10000, // ping/pong
minPlayersToContinue: 3,    // quorum de continuation (A4)
```

---

## 6. Protocole — nouveaux messages

Toujours par **nom de personnage**, jamais par `playerId`. Le `code` est une
chaîne machine : le front choisit le texte et la langue.

| Message | Sens |
|---|---|
| `{ type:'roomClosed', code }` | La room ferme. Codes : `game_finished`, `not_enough_players`, `agent_failure` |
| `{ type:'playerDisconnected', character }` | Un joueur a perdu la connexion |
| `{ type:'playerReconnected', character }` | Il est revenu avant expiration |
| `{ type:'queue', waiting }` | Lobby : uniquement un compteur |

Toute évolution du protocole doit être répercutée dans `BACKEND.MD` et
`FRONTEND.MD` (étape 8).
