# AImpostor 🕵️

Jeu de déduction sociale en temps réel : des humains chattent au tour par tour,
l'un des joueurs est une IA. Saurez-vous la démasquer ?

---

## Prérequis

- **Node.js ≥ 20** (vérifier avec `node --version`)
- Une clé API **Mistral** (gratuite, voir ci-dessous)

## Installation

```bash
git clone <url-du-repo>
cd <repo>
npm install
```

## Obtenir une clé API Mistral (gratuit)

1. Crée un compte sur https://console.mistral.ai
2. Menu **API Keys** → **Create new key**
3. Copie la clé (elle ne sera affichée qu'une fois)

## Configurer le `.env`

À la racine du projet, crée un fichier nommé `.env` contenant :

```
MISTRAL_API_KEY=ta_cle_ici
```

⚠️ Ne jamais commiter ce fichier (il est dans le `.gitignore`).
Sans clé, le jeu tourne quand même mais le bot reste muet.

## Lancer le jeu

```bash
node --env-file=.env server.js
```

Le serveur écoute sur le port **3000**.

## Jouer

1. Ouvre **http://localhost:3000** dans ton navigateur.
2. Ouvre un **deuxième onglet** (ou fais rejoindre un ami sur le même réseau
   via `http://<ip-de-ta-machine>:3000`).
3. Dès qu'assez de joueurs sont là, un compte à rebours démarre, puis chacun
   reçoit un personnage secret.
4. Chattez chacun votre tour... et devinez qui est l'IA 🤖

## Personnaliser le jeu

Les réglages sont pour l'instant des valeurs en dur dans le code (pas encore de
fichier de config). Modifier la valeur, relancer le serveur, c'est pris en compte.

### La room — `game/room.js` (constructeur de `Room`)

| Paramètre | Défaut | Rôle |
|---|---|---|
| `maxPlayers` | `5` | taille de la room : la partie démarre dès qu'elle est pleine. ⚠️ Le bot compte dans ce total (5 = 4 humains + 1 bot) |
| `minPlayers` | `3` | nombre de joueurs (bot inclus) qui déclenche le compte à rebours de départ |
| `timer` | `10` | durée (en secondes) du compte à rebours avant le début de partie — le temps laissé aux retardataires pour rejoindre |

### Les manches — `game/round.js` (constructeur de `Round`)

| Paramètre | Défaut | Rôle |
|---|---|---|
| `turnPerRound` | `10` | nombre de **cycles** de parole par manche (1 cycle = chaque joueur parle une fois). Plus il est haut, plus la manche est longue |
| `turnDuration` | `10` | durée (en secondes) du tour de parole de chaque joueur. Trop court : les humains n'ont pas le temps de taper ; trop long : la partie traîne quand quelqu'un est AFK |

### Les personnages — `game/room.js`

La liste `CARACTERS` en haut du fichier contient les pseudos attribués au
hasard à chaque manche. Ajoutez-en autant que vous voulez — il en faut juste
**au moins autant que `maxPlayers`**, sinon des joueurs se retrouveront sans
personnage.

### Le comportement du bot — `agents/mistral.js`

| Paramètre | Défaut | Rôle |
|---|---|---|
| `SYSTEM_PROMPT` | — | la « persona » du bot : c'est LE levier principal pour le rendre plus ou moins crédible. Se modifie comme du texte |
| `temperature` | `0.85` | créativité du modèle : bas = réponses sages et répétitives, haut = imprévisibles (au-delà de ~1 ça part en vrille) |
| `max_tokens` | `60` | longueur max des réponses. Bas = messages courts façon texto (recommandé) |
| `model` | `mistral-small-latest` | le modèle Mistral utilisé |

💡 Cohérence à garder en tête : si vous montez `maxPlayers`, vérifiez la
taille de `CARACTERS` ; si vous baissez `turnDuration`, pensez aux joueurs
lents à taper.

## Problèmes courants

| Symptôme | Cause probable |
|---|---|
| `command not found: node` | Node n'est pas installé (https://nodejs.org) |
| Le bot ne parle jamais | Clé absente/invalide dans `.env`, ou serveur lancé sans `--env-file=.env` |
| `EADDRINUSE :3000` | Un autre process occupe le port (un ancien serveur qui tourne encore ?) |
| La page ne charge pas depuis un autre PC | Pare-feu, ou mauvaise IP (`ip a` pour la trouver) |

## Pour aller plus loin

- Architecture et fonctionnement du backend : voir `BACKEND.md`
- Guide du frontend (contrat WebSocket) : voir `FRONTEND.md`
