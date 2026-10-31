# Reconnexion automatique de la socket de présence — plan pour le frontend

État au 28 octobre 2026 sur `dev`. Document de passation pour le dev du frontend : le
problème, le code concerné, la modification proposée, les cas limites et les tests. Les
chemins partent de `Main/requirements/frontend/app/`. **Aucun changement n'est nécessaire
côté backend ni côté game.**

---

## 1. Le problème

Scénario : un joueur est connecté, ses amis le voient « en ligne ». Le backend redémarre
(`docker restart backend`, mise à jour, plantage). La socket `/ws/presence` se ferme, et rien
ne la rouvre : le joueur reste « hors ligne » chez ses amis jusqu'à ce qu'il recharge la page.

Pourquoi c'est important :

- c'est une des démos prévues pour défendre le module *Backend as microservices* : on
  redémarre le backend pendant une partie pour montrer que les pannes restent isolées. La
  partie continue, mais la présence ne revient pas, ce qui affaiblit la démonstration ;
- le module *WebSockets* demande de gérer proprement la connexion et la déconnexion.

Côté serveur, tout est déjà en place (`backend/app/src/presence/presence.gateway.ts`) :

- au démarrage, tous les utilisateurs sont remis hors ligne (`setAllUsersOffline`) ;
- à chaque connexion, le joueur repasse en ligne et ses amis reçoivent un `presence:update` ;
- plusieurs sockets par utilisateur sont gérées (`Map<userId, Set<socket>>`) : en ligne dès
  la première, hors ligne à la fermeture de la dernière.

Il ne manque que la reprise côté client.

---

## 2. Le code actuel

| Fichier | Rôle aujourd'hui |
|---|---|
| `src/services/presenceSocket.ts` | `connectPresenceSocket(accessToken)` ouvre `wss://<host>/ws/presence?token=<jwt>`, n'écoute que `message`, et renvoie la `WebSocket` |
| `src/App.tsx` | l'effet ouvre la socket quand `accessToken` existe et la ferme (`socket.close(1000, 'Session ended')`) au changement de token ou au démontage |
| `src/pages/Friends.tsx` | s'abonne avec `subscribePresence` et n'utilise que `presence:update` |

Référence à suivre : la socket de jeu a déjà une boucle de reprise dans
`src/hooks/useGame.ts` (`scheduleReconnect`, backoff `Math.min(1000 * 2 ** attempts, 8000)`,
compteur remis à zéro sur `open`, relance déclenchée par `close` seulement).

---

## 3. Comportement attendu (critères d'acceptation)

1. Après une coupure non voulue (backend redémarré, réseau coupé), la socket se rouvre seule,
   avec un délai croissant : 1 s, 2 s, 4 s, puis 8 s au maximum entre deux essais.
2. Le délai repart à 1 s dès qu'une connexion s'ouvre.
3. Aucune reprise après une fermeture voulue : déconnexion, changement de token (y compris
   depuis un autre onglet), démontage de `App`.
4. Aucune reprise si le token est expiré. Le JWT dure 1 h et il n'y a pas de refresh token : le
   serveur refuserait chaque essai en 401, et la console se remplirait d'erreurs.
5. Les pages abonnées avec `subscribePresence` reçoivent toujours les messages, sans aucune
   modification : les listeners restent au niveau du module.
6. Démo : après `docker restart backend`, le joueur redevient « en ligne » chez ses amis en
   moins de 15 secondes environ, sans recharger la page.

---

## 4. Changements proposés

### 4.1 `src/services/presenceSocket.ts`

`connectPresenceSocket` renvoie une **fonction d'arrêt** au lieu de la `WebSocket`, et gère
elle-même la reprise. Esquisse :

```ts
// Lu sans verifier la signature : seul le serveur en decide. On veut juste
// savoir s'il sert encore a quelque chose de reessayer.
function isExpired(accessToken: string): boolean {
  const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
}

// Reprise automatique : un redemarrage du backend ferme la socket, et sans
// nouvelle connexion le joueur resterait « hors ligne » pour ses amis jusqu'au
// rechargement de la page. Meme backoff que la socket de jeu (hooks/useGame.ts).
export function connectPresenceSocket(accessToken: string): () => void {
  let stopped = false;
  let attempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket;

  function connect() {
    socket = new WebSocket(getPresenceWebSocketUrl(accessToken));
    socket.addEventListener('open', () => {
      attempts = 0;
    });
    socket.addEventListener('message', dispatchMessage);
    // Un echec declenche error puis close : la relance part de close seulement,
    // sinon chaque echec programmerait deux tentatives.
    socket.addEventListener('close', () => {
      if (stopped || isExpired(accessToken))
        return;
      const delay = Math.min(1000 * 2 ** attempts, 8000);
      attempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
  }

  connect();
  return () => {
    stopped = true;
    clearTimeout(reconnectTimer);
    socket.close(1000, 'Session ended');
  };
}
```

À noter :

- `dispatchMessage(event: MessageEvent)` reprend tel quel le corps de l'actuel listener
  `message` : parse du JSON, filtre `presence:connected` / `presence:update`, appel des
  listeners. Il est simplement sorti dans une fonction nommée pour servir à chaque connexion.
- **Pas d'import dans ce fichier** : le chargeur de tests transpile un module isolé (voir § 6),
  un import relatif ne s'y résoudrait pas. C'est déjà le cas aujourd'hui, il faut le garder.
- `isExpired` : `atob` accepte le base64 sans `=` de fin ; il suffit de convertir l'alphabet
  base64url (`-` → `+`, `_` → `/`). Le payload ne contient que de l'ASCII (les pseudos sont
  limités à `[a-zA-Z0-9_]`).

### 4.2 `src/App.tsx`

```ts
useEffect(() => {
  // La socket de presence appartient a l'application, pas a une page :
  // le joueur reste en ligne tant que sa session vit, sur tout le site.
  if (!accessToken) return;

  return connectPresenceSocket(accessToken);
}, [accessToken]);
```

La fonction renvoyée par `connectPresenceSocket` sert directement de nettoyage à l'effet.

---

## 5. Cas limites

- **StrictMode** (actif dans `src/main.tsx`) : en développement, l'effet monte, se nettoie,
  puis remonte. Le nettoyage appelle la fonction d'arrêt (`stopped = true`) : la première
  socket ne relance rien, la seconde vit normalement. La fermeture se passe comme aujourd'hui.
- **Plusieurs onglets** : chaque onglet a sa socket et sa boucle. Le serveur gère déjà
  plusieurs sockets par utilisateur, rien à faire de plus.
- **Onglet masqué** : contrairement à la socket de jeu, ne pas suspendre la reprise quand
  l'onglet est en arrière-plan. Le joueur doit rester « en ligne » ; de toute façon, les
  navigateurs ralentissent déjà les timers des onglets masqués.
- **Console** : pendant la coupure, chaque essai raté affiche une erreur WebSocket dans la
  console. C'est inévitable pendant une panne provoquée ; le plafond de 8 s limite le nombre
  de lignes. En fonctionnement normal, la console reste propre.
- **Token refusé pour une autre raison** (clé JWT changée côté serveur) : la boucle continue
  toutes les 8 s. Cas rare, acceptable.
- **Statuts manqués pendant la coupure** (amélioration optionnelle) : les `presence:update`
  envoyés pendant la coupure sont perdus, et la page Amis peut afficher un statut périmé.
  Correctif possible dans `src/pages/Friends.tsx` : recharger la liste (`loadFriendsPage`) à
  la réception d'un `presence:connected` qui suit une reconnexion. Pas au premier
  `presence:connected` de la session, sinon la page se chargerait deux fois au montage.

---

## 6. Tests

Nouveau fichier `tests/presence-reconnect.test.mjs`, dans le style de
`tests/reconnection.test.mjs` :

- reprendre son chargeur `loadTypeScript`, qui transpile le fichier `.ts` avec `typescript`
  et l'importe en URL `data:` ;
- fournir un faux `WebSocket` qui enregistre chaque instance, et
  `globalThis.window = { location: { protocol: 'https:', host: 'localhost' } }` ;
- piloter le temps avec `mock.timers` de `node:test` (`mock.timers.enable({ apis: ['setTimeout'] })`) ;
- fabriquer des tokens : `` `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s` ``.

Cas à couvrir :

1. Une coupure crée une nouvelle socket après 1 s, pas avant.
2. Des coupures successives donnent des délais de 1 s, 2 s, 4 s, 8 s, puis 8 s (plafond).
3. Un `open` remet le délai à 1 s.
4. Après l'arrêt, plus aucune socket n'est créée, même 10 s plus tard.
5. Avec un token expiré, aucune reprise après la coupure.
6. Les listeners abonnés reçoivent les messages de la nouvelle socket.

Esquisse du début du fichier :

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { mock } from 'node:test';
import ts from 'typescript';

// loadTypeScript : copie de celui de tests/reconnection.test.mjs

class FakeSocket {
  static instances = [];
  listeners = {};
  constructor(url) { this.url = url; FakeSocket.instances.push(this); }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  close() { this.emit('close'); }
  emit(type, event = {}) { for (const fn of this.listeners[type] ?? []) fn(event); }
}
globalThis.WebSocket = FakeSocket;
globalThis.window = { location: { protocol: 'https:', host: 'localhost' } };

const token = (exp) => `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`;
const inOneHour = Math.floor(Date.now() / 1000) + 3600;
const { connectPresenceSocket } = await loadTypeScript('../src/services/presenceSocket.ts');

test('une coupure relance une connexion apres 1 s', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  FakeSocket.instances = [];
  const stop = connectPresenceSocket(token(inOneHour));
  FakeSocket.instances[0].emit('close');
  mock.timers.tick(999);
  assert.equal(FakeSocket.instances.length, 1);
  mock.timers.tick(1);
  assert.equal(FakeSocket.instances.length, 2);
  stop();
  mock.timers.reset();
});
```

Commandes, depuis `Main/requirements/frontend/app` : `npm test` (lance
`node --test tests/*.test.mjs`), puis `npm run lint`.

---

## 7. Vérification manuelle

1. Deux comptes amis connectés, chacun dans son navigateur ou dans une fenêtre privée, avec
   la page Amis ouverte chez l'un des deux.
2. Depuis `Main/` : `docker compose -p ft_transcendence restart backend`.
3. Attendu : l'autre compte repasse « en ligne » en moins de 15 secondes environ, sans
   recharger la page.
4. Se déconnecter : plus aucune tentative de connexion (outils de développement, onglet
   Réseau, filtre WS).
5. Avec un token expiré, couper le backend : aucune boucle d'essais. Pour le simuler, attendre
   l'expiration (1 h) ou remplacer dans le `localStorage` le token par un JWT dont `exp` est
   passé.

---

## 8. Fichiers touchés

| Fichier | Modification |
|---|---|
| `src/services/presenceSocket.ts` | boucle de reprise, fonction d'arrêt, `isExpired` |
| `src/App.tsx` | une ligne : l'effet renvoie la fonction d'arrêt |
| `tests/presence-reconnect.test.mjs` | nouveau |
| `src/pages/Friends.tsx` | optionnel : rechargement de la liste après une reconnexion |

Estimation : 1 à 2 heures, tests compris.
