# Modifications depuis la partie frontend

**Branche :** `dev-frontend` — **Date :** 26/09/2026 — **Statut :** non commité (à pousser après validation collective)

## Contexte

La partie vote de l'UI (zone de vote, scoreboard de fin de manche, écran de fin de partie) n'était
pas reliée au backend : la couche WebSocket du frontend ignorait les messages `vote`, `voteRegistered`,
`roundTransition`, `gameEnd` et `roomClosed`, et le backend ne diffusait pas les données nécessaires.
Les composants d'affichage existaient déjà (`pages/VoteSystem.tsx`) mais n'étaient importés nulle part.

---

## Partie game modifiée

### `Main/requirements/game/app/game/room.js`

**Ce qui a changé :** la liste `CARACTERS` passe de 8 à 6 personnages.

```js
// Avant (8) :
['Colonel Moutarde', 'Major Wasabi', 'Caporal Mayo', 'Lieutenant Samourai',
 'General Ketchup', 'Marechal Cocktail', 'Sergent Barbecue', 'Capitaine Tartare']

// Apres (6) :
['Colonel Moutarde', 'Major Wasabi', 'Caporal Poivre', 'Lieutenant Mayo',
 'General Ketchup', 'Marechal Cocktail']
```

**Pourquoi :** le frontend ne possède d'assets (portraits, couleurs, lore) que pour 6 personnages.
`utils/characters.ts` fait un fallback sur le portrait du Colonel Moutarde pour tout personnage
inconnu : les 4 personnages supplémentaires s'affichaient donc tous avec la même tête. La liste
devra être harmonisée en équipe (voir « Points à valider »).

### `Main/requirements/game/app/game/config.js`

**Ce qui a changé :** `maxPlayers: 8` devient `maxPlayers: 6`.

**Pourquoi :** `Round.assignCaracters()` fait `shuffle(CARACTERS).slice(0, this.players.length)`
puis attribue `pool[i]` à chaque joueur. Avec 6 noms, un 7e ou 8e joueur recevrait `undefined`
comme personnage. Tant que la liste fait 6, la room doit être plafonnée à 6. Tous les autres usages
(`queue.js`, `room.js`) lisent `gameConfig.maxPlayers`, le plafond se propogue partout.

### `Main/requirements/game/app/game/round.js`

**Ce qui a changé :** le broadcast de fin de manche emporte maintenant les données calculées.

```js
// Avant : message vide
this.broadcast({ type: 'roundTransition' });

// Apres
this.broadcast({
    type: 'roundTransition',
    results,      // tableau des scores de la manche, deja trie
    aiCharacter, // le personnage qu'incarnait l'IA
});
```

**Pourquoi :** `results` et `aiCharacter` n'existaient que comme variables locales de `endRound()`,
elles n'atteignaient jamais le réseau. Aucun frontend ne pouvait afficher le tableau des scores,
quelle que soit la façon de le brancher. Le commentaire au-dessus du broadcast disait déjà
« Diffuser les résultats à tous les joueurs » — c'était la moitié jamais écrite de la fonctionnalité.
Le serveur est de toute façon la seule source possible : l'identité de l'IA et les votes sont
secrets, le frontend ne peut pas recalculer ces scores.

**Compatibilité :** purement additif. Un client qui ignore ces champs fonctionne comme avant
(l'ancien frontend filtrait ce message de toute façon).

---

## Partie frontend (résumé du câblage)

| Fichier | Rôle |
|---|---|
| `services/gameSocket.ts` | Types entrants + whitelist : `voteRegistered`, `roundTransition`, `gameEnd`, `roomClosed`. Exports `RoundResult` / `FinalRank`. Sortants : `sendVoteMessage`, `sendReplayMessage` |
| `hooks/useGame.ts` | `handleVote`, `handleReplay` (reset local + message `replay`), cases reducer pour les nouveaux messages |
| `pages/Game.tsx` | `VoteArea` branchée sur `handleVote` ; affichage de `ScoreboardModal`, `GameEndModal`, `RoomClosedModal` (importées de `VoteSystem.tsx`) |
| `components/game/VoteArea.tsx` | Vote cliquable pendant la phase de discussion (`canVote`) : le backend collecte les votes en temps réel pendant `chatting`, il n'existe pas de phase `voting` distincte |
| `utils/characters.ts` + `public/*.png` | `Lieutenant Majo` renomme en `Lieutenant Mayo` (noms + fichiers images) |

## Protocole WebSocket (récapitulatif)

| Sens | Message | Contenu |
|---|---|---|
| client → serveur | `vote` | `{ targetCharacter }` — accepté seulement en phase `chatting`, un vote par joueur, l'IA ne vote pas |
| serveur → client | `voteRegistered` | accusé de réception envoyé au votant |
| serveur → client | `roundTransition` | `{ results, aiCharacter }` — fin de manche, suivi du statut `transition` |
| serveur → client | `gameEnd` | `{ ranking, winnerId, history }` — fin de partie |
| serveur → client | `roomClosed` | `{ code }` — fermeture de room (suivra toujours `gameEnd` en fin normale) |
| client → serveur | `replay` | remet le joueur dans la file d'attente, accepté une fois la room fermée |

Messages backend encore non câblés côté frontend (informatifs, sans urgence) :
`agentsDown`, `playerDisconnected`, `debriefWait`.

## Points à valider en équipe

1. **Liste des personnages** : 6 (côté front actuel) ou 8 (version game précédente) ?
   Arbitrage à faire ; les deux fichiers concernés sont `room.js` et `config.js`.
2. **Payload de `roundTransition`** : validation que les résultats voyagent avec le message
   (rétro-compatible, cf. ci-dessus).
3. **Vote temps réel pendant la discussion** : c'est le design du game (`onPlayerVote` exige
   `status === 'chatting'`). Le frontend affiche désormais la zone de vote pendant toute la
   manche plutôt qu'une phase dédiée — à confirmer que c'est le comportement voulu.
4. Rien n'a été testé en conditions réelles (build Docker + partie complète) : à faire ensemble.
