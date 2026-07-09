# AImpostor — Guide Frontend (React ↔ Backend)

> Document destiné au dev frontend du projet. Aucune connaissance préalable du
> backend n'est supposée. Lis-le dans l'ordre : le contrat des messages
> (section 4) est le cœur — tout le reste existe pour que tu le comprennes.

---

## 1. Le jeu en une minute

AImpostor est un jeu de déduction sociale en temps réel. Des joueurs humains
discutent dans un chat **au tour par tour** ; l'un des « joueurs » est en
réalité une IA (un LLM). À chaque manche, chaque joueur reçoit un **personnage**
tiré au sort (`Colonel Moutarde`, `Major Wasabi`…) qui masque son identité.
À la fin des tours de parole, tout le monde vote pour démasquer l'IA.

Conséquence directe pour toi : **le frontend ne sait presque rien**. Il ne
connaît ni qui est qui, ni qui est l'IA. Il ne fait qu'afficher ce que le
serveur lui envoie. C'est voulu, et c'est une règle de sécurité (voir §6).

---

## 2. Architecture générale

```
┌─────────────────────┐         ┌─────────────────────┐
│  Container FRONTEND │         │  Container BACKEND  │
│                     │         │                     │
│  React (ton code)   │         │  Node.js + Express  │
│  servi par Vite/    │◄───────►│  + WebSocket (ws)   │
│  nginx              │   WS    │  + logique de jeu   │
│                     │  JSON   │  + agent IA (LLM)   │
└─────────────────────┘         └─────────────────────┘
```

- **Deux containers séparés** : ton React est buildé et servi d'un côté ;
  le backend Node tourne de l'autre. Ils ne partagent aucun code.
- **Un seul canal d'échange : une connexion WebSocket**, ouverte par le
  navigateur vers le backend, qui reste ouverte toute la session.
- **Tout ce qui transite est du JSON** (dans les deux sens).

Il n'y a (pour l'instant) **pas d'API REST à consommer** : pas de `fetch`,
pas d'axios. Une seule connexion WebSocket suffit à tout le jeu.

---

## 3. WebSocket : ce que c'est, en 2 minutes

Tu connais peut-être le modèle HTTP classique : le client demande, le serveur
répond, la connexion se ferme. Ce modèle ne marche pas pour un chat : quand un
autre joueur écrit, ton navigateur doit recevoir le message **sans avoir rien
demandé**.

Le **WebSocket** résout ça : une connexion qui s'ouvre une fois puis **reste
ouverte**, dans laquelle **les deux côtés peuvent envoyer à tout moment**
(full-duplex). Le navigateur a un client WebSocket intégré :

```js
const socket = new WebSocket('ws://localhost:3000');

socket.onopen    = () => { /* connecté */ };
socket.onmessage = (event) => {
	const msg = JSON.parse(event.data);   // event.data est une STRING JSON
	// ... router selon msg.type (voir §4)
};
socket.onclose   = () => { /* déconnecté (afficher un état "reconnexion ?") */ };

// envoyer :
socket.send(JSON.stringify({ type: 'chat', text: 'salut' }));
```

Trois règles :

1. **On parse à la réception** (`JSON.parse(event.data)`) et **on stringify à
   l'envoi**. Le WebSocket ne transporte que du texte, pas des objets.
2. **L'URL doit s'adapter à l'environnement.** En dev local c'est
   `ws://localhost:3000`. En production derrière le reverse proxy nginx en
   HTTPS, ce sera `wss://` (WebSocket chiffré) sur la même origine que la
   page. Le pattern qui marche partout :
   ```js
   const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
   const socket = new WebSocket(`${proto}//${location.host}`);
   ```
   ⚠️ En dev, front et back ne sont PAS sur la même origine (deux containers,
   deux ports) : il faudra soit une URL de dev explicite
   (`ws://localhost:3000` via une variable d'environnement Vite), soit un
   proxy de dev. À décider ensemble — voir §7.
3. **Une page = une connexion.** On ouvre le socket une fois au montage de
   l'app, on le garde, on le partage dans toute l'app (voir §5).

---

## 4. LE CONTRAT : les messages échangés (à connaître par cœur)

C'est la partie la plus importante du document. Le backend et le frontend ne
partagent aucun code — **ce contrat JSON est leur seul lien**. Chaque message
a un champ `type` qui dit sa nature ; ton code route selon ce champ.

### 4.1 Messages que TU REÇOIS du serveur

#### `state` — état de la salle (public)
```json
{ "type": "state", "status": "waiting", "players": 2, "room_number": 1, "countdown": 8 }
```
| Champ | Sens |
|---|---|
| `status` | `'waiting'` (attente de joueurs), `'countdown'`, `'playing'`, … |
| `players` | nombre de joueurs connectés dans la room |
| `room_number` | numéro de la room |
| `countdown` | secondes avant le début de partie, ou `null` |

Envoyé à chaque changement (arrivée/départ d'un joueur, tick du compte à
rebours de démarrage…). → Affiche un bandeau d'état + le compteur.

#### `assignment` — ton personnage (PRIVÉ, une fois par manche)
```json
{ "type": "assignment", "character": "Colonel Moutarde" }
```
Le serveur t'attribue ton personnage pour la manche. **Chaque joueur ne reçoit
que le sien.** Stocke-le (state React) : c'est LA donnée qui permet de savoir
si « c'est mon tour » (comparaison avec `turn.character`).
→ Affiche un badge permanent « Tu incarnes : Colonel Moutarde ».

#### `yourTurn` — c'est ton tour (PRIVÉ)
```json
{ "type": "yourTurn", "countdown": 7 }
```
Envoyé uniquement au joueur dont le tour commence. Redondant avec la
comparaison `turn.character === myCharacter`, mais explicite et pratique :
focus le champ de saisie, déclenche l'état visuel « à toi ».

#### `turn` — état du tour en cours (public, envoyé CHAQUE SECONDE)
```json
{
  "type": "turn",
  "character": "Major Wasabi",
  "countdown": 5,
  "turnCycle": 4,
  "turnOrder": ["Major Wasabi", "Colonel Moutarde", "Caporal Mayo"]
}
```
| Champ | Sens |
|---|---|
| `character` | le personnage dont c'est le tour |
| `countdown` | secondes restantes dans ce tour |
| `turnCycle` | cycles restants (démarre à 5, décroît) — round affiché = `5 - turnCycle + 1` |
| `turnOrder` | tous les personnages, dans l'ordre de jeu |

C'est TON tick d'horloge : le timer affiché doit juste refléter `countdown`
(**ne fabrique pas de timer côté client**, tu serais désynchronisé — re-render
à chaque message reçu, c'est tout).
→ Liste des joueurs (personnages) avec highlight sur `character` ;
→ gros compte à rebours visible ;
→ si `character === myCharacter` : état « À TOI DE JOUER » + input activé.

#### `chat` — un message validé par le serveur
```json
{ "type": "chat", "sender": "Caporal Mayo", "text": "je vote wasabi" }
```
`sender` est un **nom de personnage** (jamais un id). Un message n'apparaît
ici QUE si le serveur l'a accepté (bon joueur, bon moment). Si un joueur tape
hors de son tour, il ne se passe rien — c'est normal, pas un bug.
→ Ajoute une ligne au fil de chat (auto-scroll en bas).

#### `roundState` — changement de phase
```json
{ "type": "roundState", "status": "voting" }
```
Pour l'instant, une seule valeur utile : `'voting'` = fin des tours de parole.
→ Bandeau « phase de vote », input désactivé. (L'UI de vote viendra plus tard.)

### 4.2 Messages que TU ENVOIES au serveur

Un seul, pour l'instant :

```json
{ "type": "chat", "text": "mon message" }
```

⚠️ **N'envoie JAMAIS de champ `sender`.** Le serveur sait qui tu es par ta
connexion — c'est lui qui décide de l'identité affichée. Tout champ
supplémentaire sera ignoré (et un client qui prétend être quelqu'un d'autre
est précisément ce contre quoi le serveur se protège).

### 4.3 Cycle de vie type d'une session

```
connexion ouverte
  → state (waiting, 1 joueur)      // tu attends
  → state (waiting, 2 joueurs)     // quelqu'un arrive
  → state (countdown, 10…9…8…)     // le départ approche
  → state (playing)
  → assignment (ton personnage)    // PRIVÉ
  → turn (toutes les secondes)     // la manche vit
  → yourTurn                       // quand c'est toi
  → chat (au fil des messages)
  → … turn/chat pendant 5 cycles …
  → roundState (voting)            // fin des tours
```

---

## 5. Côté React : les patterns recommandés

Tu es libre de l'architecture, mais voici les patterns qui évitent les pièges
classiques WebSocket + React.

### 5.1 Une seule connexion, dans un contexte

Le socket doit être créé **une fois** (pas à chaque render !). Le pattern
standard : un `useEffect` avec dépendances vides dans un composant racine (ou
un Context Provider), et la fermeture propre dans le cleanup :

```jsx
useEffect(() => {
	const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const socket = new WebSocket(import.meta.env.VITE_WS_URL ?? `${proto}//${location.host}`);

	socket.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		dispatch(msg);   // router vers le state (voir 5.2)
	};

	socket.onclose = () => setConnected(false);
	socket.onopen  = () => setConnected(true);

	socketRef.current = socket;
	return () => socket.close();   // cleanup au démontage
}, []);   // ← dépendances VIDES : une seule création
```

Piège classique : si tu crées le socket dans le corps du composant (hors
`useEffect`), chaque re-render ouvre une nouvelle connexion → le serveur voit
des dizaines de « joueurs » fantômes.

### 5.2 Router les messages vers le state

Chaque `type` de message alimente un morceau de state différent. Un
`useReducer` s'y prête très bien (un `switch` sur `msg.type`) :

```js
function reducer(state, msg) {
	switch (msg.type) {
		case 'state':      return { ...state, room: msg };
		case 'assignment': return { ...state, myCharacter: msg.character };
		case 'turn':       return { ...state, turn: msg };
		case 'chat':       return { ...state, feed: [...state.feed, msg] };
		case 'roundState': return { ...state, phase: msg.status };
		default:           return state;   // type inconnu → on IGNORE (compat future)
	}
}
```

Note le `default` : le backend ajoutera des types de messages plus tard
(vote, scores…). Un type inconnu ne doit jamais faire crasher le front.

### 5.3 Les données dérivées se CALCULENT, ne se stockent pas

- « C'est mon tour ? » → `turn.character === myCharacter` (au render).
- « Numéro du round ? » → `5 - turn.turnCycle + 1`.
- « Input actif ? » → `phase chat en cours ET c'est mon tour`.

Ne duplique pas ces infos dans le state : calcule-les à l'affichage. Une seule
source de vérité (les messages reçus), des vues dérivées.

### 5.4 Le timer : afficher, ne pas simuler

Le serveur envoie un message `turn` chaque seconde avec le `countdown` déjà
décrémenté. Ton timer, c'est **littéralement afficher `turn.countdown`**.
N'ajoute pas de `setInterval` côté client pour « lisser » : deux horloges
finissent toujours par diverger, et c'est celle du serveur qui fait foi.

---

## 6. Sécurité : ce que le front ne doit JAMAIS faire

Le jeu repose sur des secrets (qui est quel personnage, qui est l'IA). Règles
absolues, non négociables :

1. **Tout ce que le serveur t'envoie est visible par le joueur** (F12 →
   Network → WS → Frames : n'importe qui lit les trames). C'est pourquoi le
   serveur n'envoie JAMAIS d'ids de joueurs ni de flag IA. Si tu vois passer
   un champ de ce genre un jour, c'est un bug backend : signale-le,
   ne l'affiche pas.
2. **Le client n'applique aucune règle de jeu.** Désactiver l'input hors de
   son tour est du confort UX ; la vraie barrière est côté serveur (un message
   hors tour est ignoré). Ne code jamais une logique « j'empêche X donc X est
   impossible » côté front.
3. **Pas de `console.log` des messages bruts en production** — ça revient à
   afficher les trames en plus lisible.
4. **N'envoie que le contrat** (§4.2). Pas de champs bonus.

---

## 7. Dev en containers séparés : les deux points de friction

### 7.1 L'URL du WebSocket en dev

En dev, ton React tourne (par ex.) sur `localhost:5173` (Vite) et le backend
sur `localhost:3000`. `location.host` pointerait sur le front → mauvaise cible.
Solution simple : une variable d'environnement Vite :

```
# .env.development
VITE_WS_URL=ws://localhost:3000
```

```js
const url = import.meta.env.VITE_WS_URL ?? `${proto}//${location.host}`;
```

En production (derrière nginx, même origine), la variable n'existe pas et le
fallback `location.host` prend le relais — le même code marche partout.

### 7.2 En production : nginx fait le pont

Le reverse proxy nginx servira le front ET routera le WebSocket vers le
backend sur la même origine (`wss://…/ws`). C'est configuré côté infra ;
ce qui te concerne : ne JAMAIS coder en dur `ws://localhost:3000` dans le
code — toujours passer par la variable d'env + fallback ci-dessus.

(Bonus : comme tout passe par le WebSocket, pas de problème de CORS à gérer.
Si un jour on ajoute une API REST, on en reparlera.)

---

## 8. Checklist de validation (à deux onglets)

Ouvre l'app dans deux onglets côte à côte :

- [ ] Les deux onglets affichent « waiting » puis le compte à rebours de départ.
- [ ] Au démarrage de manche, chaque onglet affiche SON personnage (différents).
- [ ] La liste des personnages s'affiche dans l'ordre de jeu, le highlight
      suit le tour, seconde par seconde.
- [ ] Le round affiché passe de 1/5 à 2/5 après un cycle complet.
- [ ] Le compte à rebours du tour descend chaque seconde (sans timer local).
- [ ] Seul l'onglet du joueur courant peut taper ; l'autre a l'input grisé
      avec un placeholder explicite.
- [ ] Quand c'est mon tour, l'état « à toi de jouer » est impossible à rater.
- [ ] Après 5 cycles : bandeau « phase de vote », input désactivé.
- [ ] Fermer un onglet : l'autre voit le nombre de joueurs baisser.
- [ ] F12 → Network → WS : aucune trame ne contient d'id joueur ni de flag IA.

---

## 9. Ce qui arrive ensuite (pour anticiper, pas pour coder maintenant)

- **Phase de vote** : nouveaux types de messages (`vote`, résultats…). Le
  reducer du §5.2 est prêt à les accueillir (nouveau `case`).
- **Authentification** (login 42, JWT) : viendra AVANT la connexion WebSocket,
  probablement via une vraie page de login + un token passé à la connexion.
- **Scores / historique** : probablement une petite API REST à côté du WS.

Le contrat du §4 évoluera — il sera toujours la référence unique entre nous.
Toute divergence entre ce doc et le comportement observé = on en parle, on
met à jour le doc.
