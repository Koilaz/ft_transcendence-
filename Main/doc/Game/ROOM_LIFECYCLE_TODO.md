# AImpostor — Cycle de vie des rooms

**Document de passation.** À lire entièrement avant d'écrire une ligne de code.

---

## 1. Le jeu en trois phrases

AImpostor est un jeu de déduction sociale en temps réel. Plusieurs joueurs humains discutent à tour de rôle dans un chat, et **l'un des participants est un bot piloté par un LLM**. À la fin de chaque manche, tout le monde vote pour désigner qui est l'IA.

Pour empêcher qu'on reconnaisse quelqu'un à son pseudo, chaque joueur reçoit un **nom de personnage tiré au sort** à chaque manche (Colonel Moutarde, Major Wasabi…). Les vrais identifiants ne quittent jamais le serveur.

---

## 2. Règle numéro un : le secret

> **Aucun message envoyé au client ne doit permettre de déduire quel joueur est le bot.**

C'est la règle qui prime sur toutes les autres. Elle a des conséquences directes sur ta tâche :

- Un message d'erreur ne dit **jamais** que l'IA a échoué. Si tu écris « le bot ne répond plus », le seul joueur muet est identifié et la partie est morte.
- Le détail technique va dans les **logs serveur** (`console.error`). Le client reçoit un code neutre et générique.
- Ne broadcast jamais un `playerId`. Uniquement des noms de personnages.

Le modèle d'information du projet a trois niveaux : **public** (broadcast à tous), **privé** (envoyé à un joueur précis), **secret serveur** (ne sort jamais). Le mapping joueur → personnage et la nature IA d'un joueur sont du secret serveur.

---

## 3. Architecture — ce que tu dois connaître

Le service de jeu est un conteneur Node.js indépendant (pas le NestJS), en WebSocket natif (`ws`). Le backend est **autoritaire** : toute la logique vit côté serveur, le client est un renderer passif qui affiche ce qu'on lui envoie.

### Les quatre objets

| Objet | Rôle | Durée de vie |
|---|---|---|
| `Room` | Le salon. Contient les joueurs, l'historique, la suite des manches. | Toute la partie |
| `Round` | Une manche. Tire les personnages et l'ordre de jeu, gère les tours. | Une manche |
| `Player` | Identité persistante d'un joueur (humain ou IA). | Toute la partie |
| `Agent` | Un fournisseur LLM (Mistral cloud, Ollama local…). | Global |

`Room` contient une `Map` de `Player` (identité stable) et un tableau de `Round`. À chaque nouvelle manche, un `Round` neuf est créé : les personnages sont redistribués, l'ordre de jeu re-mélangé.

### Le patron `sendFn`

Un `Player` ne connaît **pas** sa socket. Il reçoit à la construction une fonction `sendFn(message)` et se contente de l'appeler. Conséquence importante pour toi :

**Le bot est un `Player` parfaitement ordinaire.** Sa `sendFn` n'écrit pas dans une socket : c'est une closure qui filtre les messages, et quand elle voit `yourTurn`, appelle le LLM puis republie la réponse par le même chemin que les humains (`room.addMessage`). Il n'existe aucun chemin de code privilégié pour l'IA.

Cela signifie que **ton code de gestion de room ne doit jamais avoir de branche `if (isBot)`**, sauf pour compter les humains (voir §6, piège 1).

### Les timers

Il y a **deux `setInterval`** actifs dans le système, et ils sont la principale source de fuites :

- `Room.timerId` — le compte à rebours avant démarrage (quand assez de joueurs sont là)
- `Round.turnTimerId` — le chrono du tour en cours

---

## 4. Ta mission

Le cycle de vie des rooms n'existe pas aujourd'hui. Concrètement :

- Une room n'est **jamais** détruite. Elle reste dans la `Map` du module même vidée de tous ses joueurs.
- Une déconnexion en pleine manche n'est pas gérée du tout. Le `Round` garde une référence vers un joueur parti.
- Il n'y a aucun moyen de fermer une room aux nouveaux arrivants sans qu'elle soit pleine.

### Obligatoire

**O1. Une méthode `Room.destroy(reason)`**, dans cet ordre strict :

1. Broadcast le message de fin aux joueurs — **avant** tout nettoyage, sinon tu émets dans le vide
2. `clearInterval` sur `Room.timerId`
3. `clearInterval` sur le `turnTimerId` du round courant
4. Retire la room de la `Map` du module

L'ordre 1 → 2/3 → 4 n'est pas négociable.

**O2. Exposer une fonction de suppression depuis `room.js`.** La `Map rooms` est privée au module ; rien à l'extérieur ne peut y toucher aujourd'hui.

**O3. Un état « fermée » distinct de « pleine ».** `findOrCreateRoom` ne teste actuellement que `isFull()`. Il faut un second critère, sinon un joueur sera placé dans une room en cours de partie ou en train de mourir.

**O4. Gérer la déconnexion pendant une manche.** `removePlayer` retire le joueur de la `Map` de la room mais **ne prévient pas le `Round`**, qui garde le joueur dans `turnOrder`, `playerById`, `assignments` et potentiellement dans `currentPlayer`. Le tour du fantôme arrivera et le serveur enverra `yourTurn` dans le vide.

**O5. Détruire les rooms vides.** Sans ça, chaque partie terminée laisse un objet et ses timers en mémoire jusqu'au redémarrage du conteneur.

Attention à la définition de « vide » : `players.size === 0` **n'arrivera jamais**, puisque le bot ne se déconnecte pas (voir §6, piège 1). Le cas concret est une room en `waiting` qui a compté quelques humains, les a tous perdus, et reste en mémoire avec son seul bot. Deux approches possibles : compter les joueurs non-IA (nécessite de réparer le champ `isAI`), ou tenir un compteur de connexions actives dans la `Room`.

**O6. Un code d'erreur neutre vers le front.** Format suggéré : `{ type: 'roomClosed', code: 'not_enough_players' }`. Le `code` est une chaîne machine, pas une phrase : le front choisit le texte et la langue. Deux ou trois codes suffisent. **Toute évolution du protocole WebSocket doit être répercutée dans `BACKEND.md` et `FRONTEND.md`.**

### Suggestions (à valider ensemble)

**S1. Politique de déconnexion en cours de manche** — proposition initiale :

> Un joueur quitte pendant une manche → la manche est **annulée et rejouée** avec un joueur de moins. La room se **ferme aux nouveaux arrivants** jusqu'à la fin de la partie.

C'est une base saine, mais trois questions restent ouvertes :

- **Que devient `room.history` ?** Les messages de la manche annulée référencent des personnages qui n'existent plus après redistribution. Le bot lit cet historique pour générer ses réponses — un historique incohérent dégrade directement sa crédibilité. *Recommandation : purger l'historique de la manche annulée, ou marquer sa frontière.*
- **Combien de fois ?** Sans limite, un joueur qui se sent démasqué peut quitter pour forcer un redémarrage, ou un réseau instable peut boucler indéfiniment. *Recommandation : un compteur d'annulations, au-delà duquel la partie s'arrête.*
- **Que devient le `Round` annulé** dans `this.rounds` ? Le laisser fausse les statistiques et le numéro de manche.

**S2. Seuil de fermeture** — proposition initiale :

> Sous `minPlayers`, la partie entière est annulée et la room fermée.

Simple et défendable. Attention : `minPlayers` est un seuil de **démarrage**. Rien n'oblige à réutiliser la même valeur pour continuer une partie déjà lancée. Une alternative est un seuil de continuation plus bas (une partie à 3 reste jouable), ce qui rend le jeu moins fragile aux déconnexions. À arbitrer selon ce qu'on veut privilégier : qualité de partie ou robustesse.

**S3. Reconnexion.** Aujourd'hui une déconnexion est définitive. Un délai de grâce (le joueur garde sa place quelques secondes) éviterait de casser des parties pour un simple rafraîchissement de page. **Hors périmètre pour l'instant** — mais conçois `removePlayer` de façon à pouvoir l'ajouter plus tard sans tout réécrire.

**S4. Fin de partie normale.** La destruction d'une room après une partie terminée normalement suivra le même chemin que la destruction sur erreur. Écris `destroy()` en pensant à ce cas, même si la fin de partie n'est pas encore implémentée.

---

## 5. Le cas « agent en panne »

Un cas de fermeture qui ne vient pas des joueurs. Les agents LLM échouent : clé API invalide, crédit épuisé, modèle local non téléchargé, ou simplement trop lent en CPU.

La distinction utile n'est pas la cause technique mais : **réessayer au tour suivant a-t-il une chance de marcher ?**

| | Exemples | Comportement |
|---|---|---|
| Récupérable | timeout, 429, 503, coupure réseau | Le bot se tait ce tour. La partie continue. C'est un état de jeu normal — un humain aussi peut rester muet. |
| Fatal | 401, 402, 404 | Réessayer échouera identiquement à chaque tour. La partie est cassée sans que personne ne le voie. |

Le contrat en cours d'implémentation côté agents : `return null` = « rien à dire ce tour », `throw` = « je suis cassé ». Un compteur d'échecs consécutifs dans la closure du bot déclenchera la fermeture au-delà d'un seuil.

**Ce qui te concerne :** ce chemin doit aboutir au **même `destroy()`** que les autres causes, avec un code d'erreur neutre. Ne construis pas un second mécanisme de fermeture en parallèle.

---

## 6. Pièges connus — lis cette section deux fois

**Piège 1 — le bot compte dans les seuils, et c'est voulu.** `minPlayers` et `maxPlayers` s'appliquent à `players.size`, bot inclus. Avec `minPlayers = 4` et `botPerRoom = 1`, une partie démarre donc avec 3 humains. **Ne « corrige » pas ce comportement** : c'est un choix de conception, pas une régression. Pour tout ce qui touche au quorum, `players.size` est la bonne mesure — tu n'as pas besoin de distinguer les bots.

Une conséquence à garder en tête : **le bot ne se déconnecte jamais.** Il n'a pas de socket, donc `removePlayer` ne sera jamais appelé pour lui. Une room dont tous les humains sont partis conserve `players.size === 1` indéfiniment (voir O5).

Accessoirement, `player.js` contient `this.IsAI = false` — le paramètre `isAI` reçu par le constructeur est ignoré, et le casing diffère du reste du code. Sans impact sur le quorum, mais le champ est inutilisable en l'état si tu en as besoin pour O5.

**Piège 2 — la copie dans `Round`.** Le constructeur de `Round` fait `new Map(players.map(...))`. C'est une **copie prise à l'instant T**. Retirer un joueur de `room.players` ne le retire pas de `round.playerById`, ni de `turnOrder`, ni de `assignments`. Il faut le faire explicitement.

**Piège 3 — timers non nettoyés.** Un `setInterval` oublié continue de tourner et de `broadcast` sur une room que plus personne ne référence. C'est une fuite doublée d'un usage après libération logique — l'équivalent d'un thread détaché qui écrit dans un buffer déjà libéré. Vérifie toujours qu'un `clearInterval` accompagne chaque chemin de sortie.

**Piège 4 — casing incohérent des statuts.** `Room.status` utilise `'waiting'`, `'playing'`, tandis que `Round.status` utilise `'chatting'`, `'voting'`. Les deux champs portent le même nom mais des vocabulaires différents. Vérifie systématiquement **lequel** tu lis. Une normalisation est prévue ; en attendant, ne présume rien.

**Piège 5 — `startNewRound` peut être déclenché par `addPlayer`.** Ajouter un joueur qui remplit la room lance une manche immédiatement. Attention aux appels en cascade si tu modifies ces chemins.

---

## 7. Fichiers concernés

| Fichier | Ce que tu vas y toucher |
|---|---|
| `game/room.js` | `destroy()`, la `Map rooms`, `findOrCreateRoom`, `removePlayer` |
| `game/round.js` | Retrait d'un joueur en cours de manche, annulation propre |
| `game/player.js` | Correction du champ `isAI` |
| `game/config.js` | Éventuels nouveaux seuils |
| `server.js` | Appel de `removePlayer` sur fermeture de socket |
| `BACKEND.md` / `FRONTEND.md` | Tout nouveau message du protocole |

**Ne touche pas** à `agents/`, `bot.js`, ni à la logique de tours de `round.js` — ce sont des chantiers en cours en parallèle.

---

## 8. Méthode de travail

Le projet suit le principe **« un commit, une intention »**. Découpe suggéré, chaque étape testable indépendamment :

1. `destroy()` + suppression de la `Map` (le socle : tout le reste s'appuie dessus)
2. État « fermée » et adaptation de `findOrCreateRoom`
3. Retrait propre d'un joueur du `Round` en cours
4. Détection et destruction des rooms orphelines (O5)
5. La politique d'annulation/redémarrage de manche, une fois S1 arbitré

Les étapes 1 à 4 sont indépendantes de la décision sur S1 : tu peux les livrer sans attendre l'arbitrage.

**Avant de commencer :** valide S1 et S2 avec l'équipe. Ce sont des règles de jeu, pas des détails techniques — elles engagent l'expérience de jeu.
