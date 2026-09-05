# Frontend — documentation technique

Etat du code au 7 aout 2026.

> ## ⚠ Ce frontend est temporaire
>
> Il a ete **entierement genere par IA** et n'existe que pour exercer le
> backend : verifier qu'une inscription passe, qu'un JWT circule, qu'une
> WebSocket de jeu se comporte comme prevu. **Il sera refait de zero.**
>
> Ce n'est donc pas une base de code a etendre, mais une **maquette
> fonctionnelle** : le resultat final ressemblera a ca, et les regles metier
> qu'il implemente (section 6) sont justes et valent d'etre reprises. Ce qui est
> a jeter, c'est la structure, pas le comportement.
>
> La section 7 liste ce qui doit survivre a la reecriture.

Pour lancer la stack, voir [README_TMP.md](README_TMP.md). Pour le contrat
serveur, voir [BACKEND.MD](BACKEND.MD).

---

## 1. Stack

| Element | Version | Note |
|---|---|---|
| React | 19.2 | `StrictMode` actif — double montage en dev, voir § 5 |
| react-router-dom | 7.18 | `BrowserRouter`, routes declaratives |
| Vite | 8.1 | serveur de dev uniquement |
| TypeScript | ~6.0 | |
| Tailwind CSS | 4.3 | via `@tailwindcss/vite`, importe dans `src/index.css` |
| ESLint | 10 | `npm run lint`, jamais lance en CI |

**Le container sert le serveur de dev, pas un build.** Le Dockerfile finit sur
`npm run dev -- --host 0.0.0.0` et nginx proxie vers le port 5173. Il n'y a
aucun build de production servi en statique. C'est acceptable pour du test,
c'est a changer pour le rendu final.

`vite.config.ts` : `host: '0.0.0.0'` (sinon Vite n'ecouterait que sur le
localhost **du container**), `port: 5173`, `allowedHosts: ['localhost',
'frontend']`.

---

## 2. Arborescence

```
src/
├── main.tsx                  point d'entree, monte <App /> dans #root
├── App.tsx                   ne fait que rendre <AppRouter />
├── index.css                 une seule ligne : @import "tailwindcss";
├── router/
│   └── AppRouter.tsx         les 6 routes
├── pages/
│   ├── Home.tsx              accueil, statut backend, liste des users, mode invite
│   ├── Login.tsx             formulaire de connexion
│   ├── Register.tsx          formulaire d'inscription
│   ├── Profile.tsx           profil, changement de pseudo, upload d'avatar
│   ├── Friends.tsx           amis, demandes, recherche, presence temps reel
│   ├── Game.tsx              ecran de jeu AImpostor
│   └── Game.css              326 lignes de CSS ecrites a la main
└── services/
    ├── api.ts                tous les appels REST + les types
    ├── presenceSocket.ts     WebSocket /ws/presence
    └── gameSocket.ts         WebSocket /ws/game
```

`Game.css` est la seule page a ne pas utiliser Tailwind : elle a son propre CSS,
repris du client HTML de test qui a precede le React.

---

## 3. Routage — `router/AppRouter.tsx`

| Route | Page | Protegee ? |
|---|---|---|
| `/` | `Home` | non |
| `/login` | `Login` | non |
| `/register` | `Register` | non |
| `/profile` | `Profile` | **non** — redirection manuelle dans un `useEffect` |
| `/friends` | `Friends` | **non** — idem |
| `/game` | `Game` | non, et le serveur de jeu n'authentifie personne |

Il n'y a **aucun composant de garde**. `Profile` et `Friends` lisent
`localStorage` dans un `useEffect` et appellent `navigate('/login')` si le token
manque. La page est donc montee puis remplacee, au lieu de ne jamais l'etre.

---

## 4. Authentification cote client

| Cle `localStorage` | Ecrite par | Lue par | Effacee par |
|---|---|---|---|
| `accessToken` | `Login` apres un login reussi | `Profile`, `Friends`, `api.requestWithAuth`, `Game` (presence du token seulement) | `Profile` (deconnexion, ou `getMe` en echec) |
| `guestName` | `Home`, formulaire invite | `Game`, pour l'afficher | jamais |

Etat des lieux, sans detour :

- Pas de contexte React, pas de provider. Chaque page relit `localStorage`.
- Pas d'intercepteur 401 : seul `Profile` efface le token quand `getMe` echoue.
  Ailleurs, un token expire produit une erreur affichee et rien d'autre.
- `guestName` est purement decoratif : **il n'est jamais envoye au serveur de
  jeu**, qui nomme les joueurs `joueur-N` de son cote.

---

## 5. Couche services — la partie a conserver

C'est le morceau le plus utile du frontend actuel : il decrit le contrat serveur
en types TypeScript, et il a ete verifie contre le vrai backend.

### 5.1 `services/api.ts`

| Fonction | Appelle |
|---|---|
| `getHealth()` | `GET /api/health` |
| `getUsers()` | `GET /api/users` |
| `register(data)` | `POST /api/auth/register` |
| `login(data)` | `POST /api/auth/login` |
| `getMe(token)` | `GET /api/auth/me` |
| `updateMe(token, data)` | `PATCH /api/auth/me` |
| `uploadAvatar(token, file)` | `PATCH /api/auth/me/avatar` (FormData) |
| `getFriends()` | `GET /api/friends` |
| `getFriendRequests()` | `GET /api/friends/requests` |
| `getSentFriendRequests()` | `GET /api/friends/sent-requests` |
| `sendFriendRequest(id)` | `POST /api/friends/:id` |
| `acceptFriendRequest(id)` | `PATCH /api/friends/:id/accept` |
| `removeFriend(id)` | `DELETE /api/friends/:id` |

**Deux conventions d'authentification coexistent**, et c'est a unifier :

- les appels auth/profil recoivent le token **en argument** ;
- les appels amis passent par `requestWithAuth`, qui lit `localStorage`
  lui-meme.

`parseError()` gere le fait que NestJS renvoie `message` tantot en chaine,
tantot en tableau (`ValidationPipe`). Ce detail est a garder : sans lui, une
erreur de validation s'affiche `[object Object]`.

Sur `uploadAvatar`, ne **jamais** poser `Content-Type` a la main : le navigateur
doit generer lui-meme le `boundary` du multipart.

### 5.2 `services/presenceSocket.ts`

`connectPresenceSocket(accessToken, onMessage)` ouvre
`wss://<host>/ws/presence?token=<jwt>` — le protocole (`ws`/`wss`) est deduit de
`window.location.protocol`. Le token passe en query string parce que l'API
WebSocket du navigateur ne permet pas de header `Authorization` ; c'est pour
cette raison que nginx masque `token=` dans ses logs.

Les messages inconnus sont ignores, un JSON invalide aussi. Types :
`presence:connected`, `presence:update`.

### 5.3 `services/gameSocket.ts`

`connectGameSocket(onMessage)` — pas de token, le service de jeu n'authentifie
personne. `sendChatMessage(socket, text)` envoie `{ type: 'chat', text }`, le
**seul** message que le client emet : il n'y a pas de `join`, le serveur assigne
la room a l'ouverture de la socket.

Les types declares couvrent exactement le protocole serveur : `state`,
`assignment`, `yourTurn`, `turn`, `chat`, `roundState`, `silence`,
`voteRegistered`, `roundEnd`, `gameEnd`, `playerDisconnected`, `roomClosed`.
Sortants : `chat`, `vote`, `replay`.

> **Attention :** `connectGameSocket` filtre les types inconnus par liste
> blanche. Un message ajoute cote serveur et oublie dans cette liste est jete
> silencieusement, sans erreur ni log. C'est exactement ce qui est arrive a
> `roomClosed`, qui figeait le client a chaque fermeture de room.

L'URL porte `?name=` avec le pseudo local, quand il existe. Voir
[BACKEND.MD § 3.6](BACKEND.MD).

---

## 6. Les pages

### `Home.tsx`
Appelle `getHealth()` et `getUsers()` au montage, affiche le statut backend et
la liste des comptes. Boutons vers Register / Login / Profile / Partie rapide.
Le formulaire « Continuer en invite » ecrit `guestName` dans `localStorage` et
navigue vers `/game` — aucun compte, aucun token.

### `Login.tsx` / `Register.tsx`
Formulaires controles classiques. `Login` stocke `accessToken` puis va sur
`/profile` ; `Register` renvoie vers `/login` (pas de connexion automatique).
Les contraintes HTML (`minLength`, `type="email"`) doublent celles des DTO.

### `Profile.tsx`
Charge le profil via `getMe`, redirige vers `/login` si le token manque ou si
l'appel echoue (et efface alors le token). Permet de changer le pseudo
(`updateMe`) et de televerser un avatar (`uploadAvatar`). Bouton de deconnexion
= suppression de la cle `localStorage`.

### `Friends.tsx`
La page la plus fournie (542 lignes). Charge en parallele profil, utilisateurs,
amis, demandes recues et demandes envoyees. Les demandes envoyees servent a
retirer de « Find users » les gens a qui on a deja ecrit.

Ouvre en plus la WebSocket de presence et met a jour les pastilles en ligne /
hors ligne a la reception de `presence:update`. C'est le seul endroit de
l'application ou du temps reel non-jeu est branche.

### `Game.tsx`
Voir la section suivante : c'est la page dont la logique doit etre reprise.

---

## 7. Ce qui doit survivre a la reecriture

Le reste peut etre jete. Ces regles-la, non : elles ont ete etablies contre le
comportement reel du serveur.

**1. Le serveur est autoritaire.** Le client ne fait jamais avancer un tour, ne
decompte jamais un chrono localement, ne devine jamais qui joue. Il rend ce
qu'on lui envoie.

**2. Le client ne connait que des personnages.** Aucun `playerId` ne franchit le
reseau. Toute future interface de vote doit designer une cible par son nom de
personnage.

**3. Une seule socket par montage, et une fonction de nettoyage obligatoire.**

```ts
useEffect(() => {
  const socket = connectGameSocket(dispatch);
  return () => { socket.close(); };
}, []);
```

Sans le `close()`, `StrictMode` (montage → nettoyage → remontage en dev) laisse
**deux joueurs connectes** cote serveur. Le bug est invisible en production et
tres deroutant en dev.

**4. Une reduction sur les messages serveur.** `Game.tsx` fait passer chaque
message dans un `useReducer` dont l'action *est* le message serveur. C'est le
bon modele : un seul endroit ou l'etat de jeu change.

**5. Les regles d'activation de la saisie.** Elles sont subtiles et deja justes :

```
saisie active  ⟺  socket ouverte
              ET  roomStatus === 'playing'
              ET  roundPhase !== 'voting'
              ET  currentTurnCharacter === myCharacter
```

Avec le placeholder qui suit l'etat : `connexion…` / `chat desactive` /
`au tour de X…` / `ton message…`.

**6. Les deux derivations d'affichage** : `getBanner()` (banniere d'etat, avec
priorite a « A TOI DE JOUER ») et `isTimerVisible()` (le chrono disparait en
phase de vote). Elles evitent d'eparpiller des `if` dans le JSX.

**7. Les avatars generes** : `colorFor()` (hash du nom → teinte HSL stable) et
`initialsFor()`. Deux fonctions pures, portables telles quelles, qui donnent une
identite visuelle constante a un personnage sans aucune ressource.

---

## 8. Limites connues et bugs

### Bug reel

**L'indicateur de round est faux.** `formatRoundIndicator()` code en dur un
total de 5 :

```ts
const round = 5 - turnCycle + 1;   // affiche "Round X/5"
```

Or `gameConfig.turnPerRound` vaut **10**. L'affichage part donc de `Round -4/5`
et n'a aucun sens. Le serveur envoie `turnCycle` (tours restants) mais **pas** le
total : soit le serveur l'ajoute au message `turn`, soit le client cesse
d'afficher une fraction.

### Manques

- **Aucune reconnexion.** A la fermeture de la socket, l'interface affiche
  « deconnecte » et y reste. Aucun retry, aucun rattrapage d'etat.
- **Aucune interface de vote** — le serveur n'envoie de toute facon rien
  au-dela de `roundState`.
- **Aucune route protegee** (§ 3).
- **Le pseudo invite ne sert a rien** cote serveur (§ 4).
- **Aucun lien entre le compte et la partie** : impossible d'afficher le vrai
  pseudo d'un joueur, le service de jeu ne le connait pas.
- **Aucune gestion du token expire** en dehors de `Profile`.
- **Langues melangees** : les pages compte sont en anglais, l'ecran de jeu en
  francais. A trancher a la reecriture.
- **Aucun `ErrorBoundary`**, aucun etat de chargement homogene.
- **Aucun test.**
- **`dist/` est commite** et perime — le container ne l'utilise pas, il lance
  Vite en mode dev.

### Points de structure a revoir

- Etat d'authentification a sortir de `localStorage` vers un contexte, avec un
  seul point de verite et un intercepteur 401.
- Unifier les deux conventions d'appel authentifie de `api.ts` (§ 5.1).
- `Friends.tsx` a 542 lignes et cinq etats de liste : a decouper.
- Deux systemes de style cohabitent (Tailwind partout, CSS a la main pour le
  jeu). En choisir un.
