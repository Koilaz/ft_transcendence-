# AImpostor — Documentation Backend

> Document d'onboarding pour le prochain développeur backend. Il décrit l'état
> RÉEL du code au moment de l'écriture : ce qui marche, comment c'est structuré,
> pourquoi c'est structuré comme ça, et ce qui reste à faire (avec les pièges
> connus). Lis dans l'ordre — les principes (§2) expliquent tout le reste.

---

## 1. Le jeu

AImpostor est un jeu de déduction sociale en temps réel. Des joueurs humains
rejoignent une room et chattent **au tour par tour** ; l'un des joueurs de la
room est une IA (un LLM via API). À chaque manche (`Round`), chaque joueur —
IA comprise — reçoit un **personnage** tiré au sort (`Colonel Moutarde`,
`Major Wasabi`…). Personne ne sait qui est derrière quel personnage. Après N
cycles de parole, une phase de vote (à implémenter) permettra de désigner
l'imposteur présumé.

## 2. Les trois principes qui gouvernent tout le code

Si tu ne lis qu'une section, lis celle-ci — chaque choix d'architecture en découle.

### 2.1 Séparation transport / logique de jeu

La logique de jeu (`game/`) ne connaît **rien** au réseau : pas de `ws`, pas
d'Express, pas de socket. Elle manipule des objets et des **fonctions
injectées**. Le transport (`server.js`) est un adaptateur mince qui traduit
socket ↔ logique.

Le mécanisme central : la **`sendFn`**. Un joueur, pour la logique de jeu,
c'est « un id + une fonction pour lui envoyer un objet ». Cette fonction est
fabriquée par le transport :

- joueur humain → une closure sur sa socket WebSocket (sérialise en JSON,
  vérifie `readyState`, envoie) ;
- joueur IA → une closure sur la room qui **réagit** aux messages reçus
  (voir §5).

Conséquence : `Room` et `Round` ne savent pas si un joueur est un humain ou
un bot. Il n'y a **aucun** `if (isAI)` dans la logique de manche — et il ne
doit jamais y en avoir.

### 2.2 Serveur autoritaire, client bête

- L'identité d'un émetteur vient TOUJOURS du serveur (`socket.playerId`
  attaché à la connexion), jamais d'un champ du message client.
- Les règles (qui parle, quand, combien de temps) sont appliquées côté
  serveur (`canSpeak`, machine à états). Désactiver un input côté client est
  du confort UX, pas de la sécurité.
- Le client ne fait qu'afficher ce que le serveur diffuse.

### 2.3 Qui voit quoi : public / privé / secret

| Niveau | Exemple | Canal |
|---|---|---|
| Public | tour courant (en personnage), countdown, état de la room | `room.broadcast(...)` |
| Privé | « tu incarnes X », « c'est ton tour » | `player.send(...)` (un seul joueur) |
| Secret serveur | `assignments` (playerId ↔ personnage), flag IA | **ne sort JAMAIS** |

Règle absolue avant d'ajouter un champ à un broadcast : « est-ce que TOUS les
joueurs ont le droit de voir ça ? ». Tout ce qui est envoyé est lisible dans
F12 → Network → WS, même si l'UI ne l'affiche pas. Ne jamais sérialiser un
objet interne (`Player`, `Round`) tel quel — toujours construire une
projection champ par champ.

## 3. Structure des fichiers

```
server.js            transport : Express (statique) + WebSocket + cycle de vie des connexions
game/
  room.js            Room (état persistant d'une salle) + matchmaking (findOrCreateRoom) + shuffle
  round.js           Round : une manche = machine à états des tours de parole
  player.js          Player : identité persistante (id + sendFn + méta)
  bot.js             createBotSendFn : le "cerveau réactif" du joueur IA
agents/
  index.js           registre des agents + generateReply (point d'entrée unique du LLM)
  mistral.js         agent Mistral : persona (system prompt) + appel API
public/
  index.html         client de test (référence d'implémentation du contrat WS)
```

Dépendances : `express`, `ws`. Node ≥ 20 (fetch natif, `--env-file`).

**Lancement** : `node --env-file=.env server.js` — le fichier `.env` contient
`MISTRAL_API_KEY=...` (jamais commité, présent dans `.gitignore`).

## 4. Les classes du jeu

### 4.1 `Room` (game/room.js)

L'état persistant d'une salle. Champs clés :

- `players : Map<playerId, Player>` — identités stables sur toute la session.
- `history : [{ sender, text }]` — le chat archivé **sous personnages** (voir
  §6.3), c'est ce que relit l'IA.
- `currentRound : Round | null` — la manche en cours.
- `status` : `'waiting' | 'countdown' | 'Playing' | ...` (⚠ incohérence de
  casse connue, voir §8).
- `minPlayers / maxPlayers` — seuils qui INCLUENT le bot (le bot occupe un
  slot dès la création de la room).

Méthodes importantes :

- `addPlayer(playerId, sendFn, opts)` — inscrit un joueur ; déclenche le
  timer de départ quand `minPlayers` est atteint ; démarre la manche quand
  la room est pleine.
- `addBot(agentName)` — crée le joueur IA (`bot-<roomId>`) avec sa sendFn
  spéciale. Appelé par `findOrCreateRoom` à la création de chaque room.
- `addMessage(sender, text)` — LE point d'entrée de toute parole (humaine ou
  IA). Applique les règles puis diffuse. Voir §6.3.
- `broadcast(message)` — envoie un objet à tous les joueurs (via leurs sendFn).
- `launchStartTimer(s)` / `startNewRound()` — le compte à rebours de départ
  et la création de manche.

### 4.2 `Round` (game/round.js)

Une manche. **C'est une machine à états pilotée par événements** — il n'y a
aucune boucle : le jeu avance parce que des événements appellent des
transitions.

État : `turnOrder` (playerIds mélangés), `turnIndex` (qui parle), `turnCycle`
(cycles restants), `countdown` + `turnTimerId` (chrono du tour),
`assignments : Map<playerId, personnage>` (SECRET).

Le cycle d'un tour :

```
startTurn()
  ├─ currentPlayer.send({type:'yourTurn'})   // ping privé (humain: UI, bot: déclencheur)
  ├─ broadcastTurn()                          // public, en personnage
  └─ setInterval 1s : countdown-- , re-broadcast
        │
        ├─ ÉVÉNEMENT A : le joueur courant poste  → onPlayerMessage() → endTurn()
        └─ ÉVÉNEMENT B : countdown atteint 0      → onTurnTimeout()  → endTurn()

endTurn()   : clearInterval (annule le perdant de la course A/B) → advanceTurn()
advanceTurn(): turnIndex++ ; fin de turnOrder → turnCycle-- ; turnCycle épuisé
              → startVotingPhase() ; sinon → startTurn()
```

Règles :

- `canSpeak(playerId)` : seul le joueur courant, en phase `'chatting'`.
- Un tour = **un** message max ; un joueur muet est sauté à l'expiration.
- Le timeout de tour est aussi le **filet de sécurité de l'IA** : si l'API
  LLM échoue, le bot se tait et la partie avance quand même. Ne jamais
  supprimer ce mécanisme.

### 4.3 `Player` (game/player.js)

Identité persistante : `id`, `sendFn`, méta (`agentName`, `isViewer`).
`send(message)` délègue à la sendFn. C'est tout — et c'est voulu : toute la
« nature » d'un joueur (humain/IA) vit dans sa sendFn, pas dans des branches
de code.

## 5. Le joueur IA (game/bot.js + agents/)

### 5.1 Le principe

Le bot est un `Player` ordinaire dont la sendFn est fabriquée par
`createBotSendFn(room, botId, agentName)`. Cette closure :

1. reçoit TOUS les messages que reçoit n'importe quel joueur (broadcasts +
   privés) ;
2. ignore tout sauf `yourTurn` ;
3. sur `yourTurn` : appelle `generateReply(room.history, agentName)`, puis
   poste la réponse via `room.addMessage(botId, reply)`.

Point crucial : le bot **parle par le même chemin que les humains**
(`addMessage`) et traverse donc les mêmes validations (`canSpeak`…). Aucun
chemin privilégié. Et l'événement A (message du joueur courant) fait avancer
la machine à états, exactement comme pour un humain.

### 5.2 La chaîne LLM

```
bot.js ──> agents/index.js::generateReply(history, agentName)
             └─ registre { mistral: mistralAgent } → agent.generate(history)
                  └─ mistral.js : transcript ("Personnage: texte\n...") 
                     + SYSTEM_PROMPT (persona) → POST api.mistral.ai → réponse texte
```

- **Contrat d'agent** : un agent = un objet `{ name, async generate(history) }`.
  Pour ajouter un agent (Groq, Ollama local, agent scripté…), créer un fichier
  dans `agents/`, respecter ce contrat, l'ajouter au registre. RIEN d'autre à
  toucher.
- `generate` reçoit l'historique en personnages — cohérent avec ce que voient
  les humains.
- Retourne `null` en cas d'échec API (géré : le bot se tait ce tour).
- La persona (system prompt), la température (0.85) et `max_tokens` (60) sont
  dans `mistral.js` : c'est LE fichier à régler pour rendre le bot crédible.

## 6. Le contrat WebSocket (référence complète)

Le frontend et le backend ne partagent aucun code : ce contrat est leur seul
lien. Il est aussi documenté côté front (FRONTEND.md) — **toute évolution doit
mettre à jour les deux documents**.

### 6.1 Reçus par le client

| Type | Contenu | Visibilité | Quand |
|---|---|---|---|
| `state` | `status, players, room_number, countdown` | public | tout changement d'état room + tick du timer de départ |
| `assignment` | `character` | privé | début de manche |
| `yourTurn` | `countdown` | privé | début de SON tour |
| `turn` | `character, countdown, turnCycle, turnOrder` | public | chaque seconde d'un tour |
| `chat` | `sender` (personnage!), `text` | public | message validé |
| `roundState` | `status` (`'voting'`) | public | changement de phase |

### 6.2 Envoyés par le client

`{ type: 'chat', text }` — uniquement. Tout autre type est ignoré par le
serveur. Le `sender` n'est jamais accepté du client.

### 6.3 Le chemin d'un message (à connaître par cœur)

```
client ──{type:'chat', text}──> server.js (handler 'message')
   parse JSON (try/catch), filtre type
   └─> room.addMessage(socket.playerId, text)     ← identité SERVEUR
         ├─ pas de manche en phase 'chatting' ? → ignoré (pas de chat libre : anti-fuite d'identité)
         ├─ !canSpeak(sender) ?                 → ignoré
         ├─ traduction  playerId → PERSONNAGE
         ├─ history.push({sender: personnage, text})
         ├─ broadcast({type:'chat', sender: personnage, text})
         └─ currentRound.onPlayerMessage(playerId)   ← fait avancer la machine
```

Le chat n'existe QUE pendant les phases de jeu, sous personnage. Pas de chat
en salle d'attente — c'est une décision de gameplay (sinon l'IA est
démasquable avant même de jouer, et les identités fuient par continuité).

## 7. Cycle de vie complet d'une session

```
connexion WS → findOrCreateRoom() → addPlayer(joueur-N, sendFn socket)
   (chaque room naît avec son bot : addBot() → bot-<roomId>)
n joueurs ≥ minPlayers → launchStartTimer(10s) → broadcast 'state' chaque seconde
room pleine OU timer à 0 → startNewRound()
   Round : tirage personnages + ordre → notifyAssignments (privés) → startTurn()
   ... tours de parole (événements A/B), turn broadcasts chaque seconde ...
turnCycle épuisé → startVotingPhase() → broadcast roundState 'voting'  [FIN ACTUELLE]
déconnexion → removePlayer ; si < minPlayers pendant l'attente : timer annulé, retour 'waiting'
```

## 8. Dette technique et bugs connus (à traiter, par priorité)

Relevés sur l'état actuel du code — vérifie qu'ils sont encore d'actualité :

1. **Le délai « humain » du bot a disparu.** `bot.js` poste la réponse
   immédiatement après le retour API (~300 ms) : c'est un tell massif. Il faut
   ré-introduire un `setTimeout` aléatoire (1.5–4.5 s, idéalement corrélé à la
   longueur de la réponse) avant `room.addMessage`. ⚠ Penser au cas où le tour
   a expiré pendant le délai : `addMessage` refusera (canSpeak) — c'est le
   comportement voulu.
2. **Le bot ne connaît pas son propre personnage.** Il reçoit `assignment`
   comme tout le monde mais l'ignore ; le prompt ne lui dit pas qui il est →
   il peut s'auto-accuser. À faire : capturer `assignment` dans la closure,
   étendre le contrat à `generate(history, context)` avec
   `context = { character }`, et injecter dans le system prompt.
3. **`Player.isAI` n'est plus stocké.** Le constructeur déstructure `isAI`
   mais ne fait plus `this.isAI = isAI` (régression). Peu utilisé aujourd'hui,
   mais nécessaire pour le comptage humains/bot et le scoring. À rétablir —
   et ne JAMAIS le diffuser.
4. **Casse incohérente des statuts** : `setStatus('Playing')` avec majuscule,
   le reste en minuscules. Uniformiser (`'playing'`) — le front compare des
   chaînes exactes.
5. **Seuils naïfs** : `minPlayers`/`maxPlayers` comptent le bot. Un
   `get humanCount()` (filtre sur isAI, cf. point 3) rendrait les règles
   lisibles : « X humains + 1 bot ».
6. **`turnPerRound = 10` mal nommé** : c'est un nombre de CYCLES de parole
   (tout le monde parle une fois par cycle). Renommer (`cyclesPerRound` ?) —
   le front calcule « Round X/5 » à partir de lui, coordonner avec le front.
7. **Départ d'un joueur en pleine manche non géré** : il reste dans
   `turnOrder` → son tour continuera d'exister (timeout systématique), et sa
   sendFn morte est appelée sans erreur mais pour rien. À traiter avec la
   phase de vote (retrait du turnOrder + éventuel abandon de manche).
8. **Reconnexion non gérée** : une déconnexion = un joueur perdu (pas de
   ré-attachement d'identité). Lié à l'authentification (voir §9).
9. **`nextPlayerId` global et prévisible** (`joueur-N`) : acceptable en dev,
   à remplacer par de vrais ids (auth) — ne jamais l'exposer au client de
   toute façon.
10. **Heartbeat absent** : les connexions mortes (câble débranché, veille) ne
    sont détectées que tardivement. La lib `ws` fournit ping/pong — à câbler
    (boucle serveur qui ping et `terminate()` les silencieux).

## 9. Prochaines étapes (du TODO.MD, ordonnées)

1. **Phase de vote** (indispensable) : nouveaux types de messages
   (`voteStart`, `vote`, `voteResult`), collecte côté Room/Round, conditions
   de victoire, et le VOTE DE L'IA (nouveau type de décision pour l'agent —
   probablement un second point d'entrée `generateVote(history, context)` à
   côté de `generate`).
2. **Fin de partie et enchaînement des manches** : scores, `startNewRound`
   suivant, rotation des personnages (déjà retirés au tirage à chaque Round).
3. **Humanisation du bot** : délai réaliste (dette #1), fautes de frappe
   simulées, longueur variable — tout se joue dans `bot.js` (timing) et
   `mistral.js` (persona).
4. **Auth + persistance** (modules 42) : login (OAuth2 42, JWT, 2FA),
   PostgreSQL pour comptes/scores/historique. La reconnexion (dette #8) se
   résout ici : l'identité devient le compte, plus la socket.
5. **Ollama en fallback local** (TODO.MD) : un nouvel agent dans le registre
   — le contrat §5.2 est prévu pour.
6. **TypeScript** : envisagé pour tout le code (le sujet l'impose côté front).
   Les bugs récurrents type « propriété inexistante silencieuse » plaident
   pour. À faire AVANT que la base grossisse encore.

## 10. Comment tester

- **Deux onglets** sur `http://localhost:3000` (le client de test
  `public/index.html` implémente tout le contrat §6 — c'est la référence).
- Vérifier : salle d'attente muette → timer de départ → personnages privés
  différents → les tours tournent (highlight + countdown) → seul le joueur
  courant peut poster → le bot parle à son tour après un délai → à la fin,
  bandeau « voting ».
- **Hygiène sécurité** : F12 → Network → WS → Frames : aucune trame ne doit
  contenir de playerId pendant une manche, ni de flag IA, jamais.
- **Sans clé API** : le serveur doit tourner, le bot restera muet (ses tours
  expirent) — c'est le comportement dégradé attendu, pas un crash.
