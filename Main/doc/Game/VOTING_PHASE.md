# AImpostor — Phase de vote

**Document de passation.** Centré sur le code existant : ce qui est déjà là, ce qui manque, et les pièges.

---

## 1. Le jeu

Jeu de déduction sociale en temps réel. Des joueurs humains discutent à tour de rôle ; **l'un des participants est un bot piloté par un LLM**. À la fin de chaque manche, on vote pour désigner l'IA.

Chaque joueur porte un **nom de personnage tiré au sort** (Colonel Moutarde, Major Wasabi…), **redistribué à chaque manche**. Les `playerId` ne quittent jamais le serveur.

**Décision actée :** le bot ne vote pas. Avec 4 joueurs dont 1 bot, il y a 3 bulletins par manche. Les bulletins ne sont pas nominatifs, donc l'absence du quatrième n'est attribuable à personne.

---

## 2. La règle du secret

> **Aucun message envoyé au client ne doit permettre de déduire quel joueur est le bot.**

Traduction technique, applicable à chaque `broadcast` que tu écriras :

- **Le client ne connaît que des personnages.** Un bulletin arrive sous la forme `{ target: 'Colonel Moutarde' }`. Le serveur traduit.
- **Ne jamais diffuser un `playerId`.** Vérifie chaque objet que tu passes à `broadcast` — c'est la fuite la plus facile à commettre.
- **Les bulletins ne sont pas nominatifs.** Diffuser les totaux par personnage est autorisé ; diffuser l'émetteur de chaque bulletin ne l'est pas.

Modèle d'information à trois niveaux : **public** (broadcast), **privé** (un joueur précis via `player.send`), **secret serveur** (`Round.assignments`, la nature IA d'un joueur).

---

## 3. Le code existant

Service de jeu : conteneur Node.js indépendant (pas le NestJS), WebSocket natif (`ws`). Backend autoritaire, client renderer passif.

### Les objets

| Objet | Rôle | Durée de vie |
|---|---|---|
| `Room` | Salon : joueurs, historique, suite des manches | Toute la partie |
| `Round` | Une manche : personnages, ordre de jeu, tours | Une manche |
| `Player` | Identité persistante (humain ou IA) | Toute la partie |

### Ton point d'entrée

`Round.startVotingPhase()` existe et contient un `console.log('phase de vote !')`. Il est appelé depuis `advanceTurn()` quand `turnCycle` tombe à zéro, et fait déjà trois choses :

```js
this.status = 'voting';
this.currentPlayer = null;
this.broadcast({ type: 'roundState', status: this.status });
```

À ce moment, `endTurn()` a déjà fait le `clearInterval` du chrono de tour. Tu pars donc d'un état propre.

`gameConfig.votingDuration = 45` est défini et **utilisé nulle part**.

### Les structures à connaître dans `Round`

| Champ | Contenu |
|---|---|
| `assignments` | `Map<playerId, personnage>` — **le secret de la manche** |
| `playerById` | `Map<playerId, Player>` — copie prise au constructeur |
| `players` | tableau des `Player` de la manche |
| `turnOrder` | `playerId` dans l'ordre de jeu |
| `status` | `'chatting'` puis `'voting'` |

Méthodes utiles : `caracterOf(playerId)`, `publicTurnOrder()` (la liste des personnages, déjà anonymisée — c'est ce que tu enverras au client comme liste de cibles votables).

**Il n'existe aucune traduction inverse personnage → `playerId`.** C'est la première chose à écrire. La relation est bien bijective (`assignCaracters` fait `shuffle(CARACTERS).slice(0, players.length)`, donc pas de doublon), tu peux construire une `Map` inverse au moment du vote.

### Les patrons à réutiliser

**Validation d'action — `Round.canSpeak(playerId)` :**

```js
canSpeak(playerId)
{
    if (this.status === 'chatting' && this.turnOrder[this.turnIndex] === playerId)
        return true
    return false
}
```

Écris `canVote(playerId)` sur le même modèle : phase correcte, joueur membre de la manche, pas déjà voté.

**Point d'entrée depuis le réseau — `Room.addMessage(sender, text)` :**

```js
addMessage(sender, text)
{
    if (!this.currentRound || this.currentRound.status !== 'chatting')
        return;
    if (!this.currentRound.canSpeak(sender))
        return;
    // ...
}
```

Deux gardes avant toute action : phase, puis droit. `Room.addVote(sender, targetCharacter)` suit la même forme, avec une garde supplémentaire — la cible doit être un personnage de cette manche.

**Timer — `Round.startTurn()` :**

```js
this.turnTimerId = setInterval(() =>
{
    this.countdown--;
    if (this.countdown <= 0)
        return this.onTurnTimeout();
    this.broadcastTurn();
}, 1000);
```

Reprends la structure pour le timer de vote, mais **dans un champ distinct** (`voteTimerId`) : réutiliser `turnTimerId` rend impossible de savoir lequel des deux chronos on annule.

**Course entre deux événements — `endTurn()` :** un tour se termine soit parce que le joueur a parlé, soit parce que le chrono a expiré. `endTurn()` fait le `clearInterval` du perdant. Ta phase de vote a exactement la même structure : *tous ont voté* contre *timeout*. Le premier arrivé annule l'autre.

### Ce qui n'existe pas du tout

- **Enchaînement des manches.** `Room.startNewRound()` n'est appelé que depuis `addPlayer` (room pleine) et la fin du compte à rebours de démarrage. Rien ne le rappelle après une manche terminée.
- **Fin de partie.** `roundNumber` s'incrémente sans limite. Pas de `roundsPerGame` en config, pas d'état terminal.
- **`Room.status`** n'utilise que `'waiting'` et `'playing'`. Le commentaire du constructeur mentionne `voting`, `shuffeling`, `endGame` — intention documentée, jamais implémentée.

---

## 4. Modèle de victoire proposé

À valider avec l'équipe, pas à prendre comme acquis :

- N manches de **difficulté croissante** — le bot change d'agent LLM à chaque manche (Ollama local, puis Mistral small, medium, large)
- **Gagner une manche** = unanimité des humains sur le bon personnage
- **Gagner la partie** = gagner toutes les manches
- **Résultat binaire et collectif** — humains ou IA, aucun score individuel

Deux implications à trancher avant de coder l'étape 4 : est-ce que la partie s'arrête à la première manche perdue (auquel cas les agents forts ne seront jamais vus en jeu), et que révèle-t-on entre deux manches. Ce sont des choix de game design — arbitre-les avec l'équipe, pas seul.

---

## 5. Ce qu'il faut construire

**O1. Traduction personnage → `playerId`.** Prérequis de tout le reste.

**O2. Collecte des bulletins.** Message client `{ type: 'vote', target: '<personnage>' }`, routage dans `server.js`, méthode `Room.addVote`.

**O3. Validation serveur complète.** Le backend ne fait confiance à aucun client. Rejeter si : la manche n'est pas en phase `voting`, l'émetteur ne fait pas partie de la manche, il a déjà voté, ou le personnage cible n'existe pas dans cette manche. L'auto-vote est à autoriser ou non — décide et documente.

**O4. Timer de vote** sur `votingDuration`, avec `clearInterval` sur **toutes** les sorties. Un collègue travaille en parallèle sur le cycle de vie des rooms et manipule les mêmes timers : synchronisez-vous.

**O5. Fin de phase sur l'électorat humain.** Voir piège 1 — ce n'est pas `players.size`.

**O6. Dépouillement interchangeable.** Exigence explicite du projet : le comptage vit dans un objet conforme à un contrat, pas en dur dans `Round`.

```js
{ name, tally(ballots, voters) -> { winner, counts, unanimous } }
```

Un objet `unanimity` pour commencer. Majorité, Borda ou Condorcet s'ajouteront au registre sans toucher au `Round` — même patron que le registre d'agents LLM dans `agents/index.js`, qui est un bon exemple à lire.

**O7. Diffusion du résultat.** Totaux par personnage, jamais l'émetteur d'un bulletin.

**O8. Enchaînement et fin de partie.** `roundsPerGame` en config, appel de `startNewRound()` après le dépouillement, état terminal.

**O9. Documenter le protocole.** Tout nouveau message dans `BACKEND.md` et `FRONTEND.md`.

---

## 6. Pièges dans le code existant

**Piège 1 — l'électorat n'est pas `players.size`.** Le bot est un `Player` ordinaire, compté dans les seuils (`minPlayers = 4` avec `botPerRoom = 1` donne une partie à 3 humains — c'est voulu, ne le « corrige » pas). Mais il ne vote pas. Si tu termines la phase quand « tout le monde a voté » en comparant à `players.size`, la condition ne sera **jamais** remplie et chaque manche ira au bout des 45 s — bug silencieux qui ressemble à un choix de design.

**Piège 2 — `Player.IsAI` est inutilisable.** Le constructeur fait `this.IsAI = false` en dur : le paramètre `isAI` est ignoré et le casing diffère du reste du code. Il te faut ce champ pour l'électorat. Répare-le, ou passe par `agentName !== null`. **Le collègue en charge des rooms a le même besoin — coordonnez-vous pour ne pas le corriger deux fois.**

**Piège 3 — la closure du bot capture `agentName`.** `createBotSendFn(room, botId, agentName)` fige la valeur à la construction. Modifier `player.agentName` entre deux manches ne changera **rien** : la closure utilisera toujours la valeur capturée. C'est exactement le mécanisme dont dépend la difficulté croissante. Il faut soit reconstruire la `sendFn`, soit lire dynamiquement `room.players.get(botId).agentName` à chaque appel.

**Piège 4 — les personnages changent à chaque manche.** `assignments` appartient au `Round`. Ne compare jamais des personnages entre deux manches, et ne stocke jamais un résultat sous forme de nom de personnage : traduis en `playerId` dès la réception.

**Piège 5 — la copie dans `Round`.** `playerById` est construit par `new Map(players.map(...))` au constructeur. Un joueur retiré de `room.players` reste présent dans `playerById`, `turnOrder` et `assignments`. Sujet partagé avec le collègue rooms.

**Piège 6 — `room.history` n'est jamais vidé.** Il accumule toute la partie, avec des noms de personnages de manches différentes. Pertinent si tu veux afficher un récapitulatif après le vote.

**Piège 7 — casing incohérent des statuts.** `Room.status` : `'waiting'`, `'playing'`. `Round.status` : `'chatting'`, `'voting'`. Même nom de champ, vocabulaires différents, et le client reçoit deux messages distincts (`state` pour la room, `roundState` pour la manche). Vérifie systématiquement lequel tu lis. Une normalisation est prévue.

**Piège 8 — `CARACTERS` contient 6 entrées** pour `maxPlayers = 6`. `assignCaracters` fait un `slice` sans garde : augmenter `maxPlayers` donnerait des personnages `undefined`.

---

## 7. Fichiers

| Fichier | Ce que tu vas y toucher |
|---|---|
| `game/round.js` | `startVotingPhase()`, collecte, timer, dépouillement |
| `game/room.js` | `addVote()`, enchaînement des manches, fin de partie |
| `game/config.js` | `roundsPerGame`, méthode de dépouillement, table agent par manche |
| `game/player.js` | Champ `isAI` (partagé avec le collègue rooms) |
| `game/voting/` | Nouveau : les objets de dépouillement |
| `server.js` | Routage du message `vote` |
| `BACKEND.md` / `FRONTEND.md` | Protocole |

**Ne touche pas** à `agents/`, `bot.js`, ni à la logique de tours de `round.js` — chantiers en cours en parallèle.

---

## 8. Ordre de travail

Le projet suit le principe **« un commit, une intention »**. Chaque étape est testable seule :

1. Traduction inverse + `canVote` + `addVote` avec validation (log brut des bulletins reçus)
2. Électorat humain + timer + fin de phase correcte
3. Objet `unanimity` + contrat `tallyMethod` + diffusion des totaux
4. `roundsPerGame`, enchaînement, fin de partie
5. Sélection de l'agent par manche (nécessite le piège 3)

Les étapes 1 à 3 ne dépendent d'aucun arbitrage de game design. L'étape 4 en dépend — voir §4.

**Deux synchronisations avant de commencer :** le collègue en charge du cycle de vie des rooms (timers, `isAI`, `playerById`), et l'auteur du frontend (nouveaux messages).
