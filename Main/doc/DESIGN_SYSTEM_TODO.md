# Design system — ce qu'il manque pour revendiquer le module

État mesuré le 28 octobre 2026 sur `dev`. Document de travail : ce qui existe, ce qui
manque, et dans quel ordre le faire. Les chemins partent de `Main/requirements/frontend/app/`.

---

## 1. Ce que demande le sujet

> **Minor (Web)** : Custom-made design system with reusable components, including a proper
> color palette, typography, and icons (minimum: 10 reusable components).

Quatre exigences : au moins 10 composants réutilisables, une palette de couleurs, une
typographie et des icônes. Le tout doit être fait maison et réellement utilisé dans
l'application.

---

## 2. État actuel

| Exigence | État | Résumé |
|---|---|---|
| ≥ 10 composants réutilisables | ✅ | 12 composants dans `src/components/ui/`, exportés par `index.ts` |
| Palette de couleurs | ❌ | aucun token de couleur, des classes Tailwind brutes partout |
| Typographie | ⚠️ | 7 polices en tokens, mais ni rôles ni échelle de tailles |
| Icônes | ❌ | aucune icône, des caractères texte en tiennent lieu |
| Utilisation cohérente | ⚠️ | le kit n'est importé que par 6 fichiers |

### 2.1 Composants — OK

| Composant | Fichier | Variantes |
|---|---|---|
| `Button` | `Button.tsx` | `primary` / `secondary` / `outline`, tailles `sm` / `md` / `lg`, `fullWidth` |
| `ButtonLink` | `ButtonLink.tsx` | mêmes variantes que `Button`, rendu en lien React Router |
| `Input` | `Input.tsx` | `label` optionnel |
| `Badge` | `Badge.tsx` | `red` / `blue` / `green` / `stone` |
| `Card` | `Card.tsx` | padding `md` / `lg` |
| `Alert` | `Alert.tsx` | `error` / `success` / `info` |
| `Title` | `Title.tsx` | niveaux 1 et 2 |
| `AppLink` | `Link.tsx` | — |
| `Avatar` | `Avatar.tsx` | `sm` / `md` / `lg` / `xl`, avatar par défaut |
| `Spinner` | `Spinner.tsx` | — |
| `Modal` | `Modal.tsx` | ouverture et fermeture animées (Framer Motion) |
| `StatBox` | `StatBox.tsx` | — |

### 2.2 Couleurs — manquant

- Aucun `--color-*` dans le bloc `@theme` de `src/index.css` : les couleurs sont écrites
  directement en classes Tailwind (`bg-stone-900`, `text-blue-400`...).
- 78 classes de couleur différentes, réparties sur 13 familles : `stone` (102 occurrences),
  `slate` (69), `blue` (59), `red` (32), `amber` (13), `emerald` (10), `cyan` (10),
  `indigo` (6), `green` (3), `yellow`, `violet` et `gray` (2 chacune), `sky` (1).
- Deux familles de gris coexistent : `slate` dans `Lobby.tsx`, `VoteSystem.tsx`,
  `PrivacyPolicy.tsx` et `TermsOfService.tsx`, `stone` partout ailleurs.
- Deux couleurs en hexadécimal en dur : `#3b82f6` et `#3ecf8e`.
- Incohérence : `Alert` en variante `success` est bleu, `Badge` en variante `green` est émeraude.

### 2.3 Typographie — partielle

- 7 polices en tokens dans `@theme` : `--font-bangers` (titres, badges) et une police par
  personnage (`--font-ketchup`, `--font-moutarde`, `--font-wasabi`, `--font-cocktail`,
  `--font-mayo`, `--font-poivre`).
- Pas de rôles (police de titre, police de texte) ni d'échelle de tailles : chaque composant
  fixe ses propres tailles avec `clamp()`. `Title` ne connaît que deux niveaux.

### 2.4 Icônes — manquant

- Aucune icône dans le code. Les seuls SVG sont `public/favicon.svg` et
  `public/default-avatar.svg`.
- Des caractères servent d'icônes : `→` (13 fois), `←` (3 fois), `★` et `☆`.

### 2.5 Utilisation du kit — partielle

- Le kit n'est importé que par `Home`, `Login`, `Register`, `Profile`, `ChatInput` et
  `VoteArea`.
- Ne l'utilisent pas : `Friends`, `Game`, `Lobby`, `PasswordChangeForm`, `PrivacyPolicy`,
  `TermsOfService`, `VoteSystem`, `Footer`, `Layout`, `DialogueArea`, `GameHeader`.
- Éléments HTML bruts au lieu des composants :
  - `<button>` : `PasswordChangeForm` (3), `VoteSystem` (4), `Lobby`, `Home`, `GameHeader` (1 chacun) ;
  - `<input>` : `PasswordChangeForm` (3), `Home`, `Profile`, `ChatInput` (1 chacun).

---

## 3. À faire

### 3.1 Palette

Déclarer des couleurs sémantiques ; Tailwind 4 génère alors les utilitaires correspondants
(`bg-surface`, `text-primary`...). Point de départ, tiré des couleurs déjà dominantes :

```css
/* inline : les utilitaires reprennent la variable citée, ce qui est conseillé quand un token
   en référence un autre */
@theme inline {
  --color-surface: var(--color-stone-950);        /* champs, StatBox */
  --color-surface-raised: var(--color-stone-900); /* Card, Modal */
  --color-border: var(--color-stone-700);
  --color-text: var(--color-white);
  --color-text-muted: var(--color-stone-500);
  --color-primary: var(--color-blue-500);
  --color-primary-hover: var(--color-blue-400);
  --color-danger: var(--color-red-500);
  --color-success: var(--color-emerald-500);
  --color-warning: var(--color-amber-500);
}
```

- Garder une seule famille de gris : `stone`, majoritaire, et convertir les `slate` des
  quatre fichiers cités en 2.2.
- Remplacer les deux couleurs en hexadécimal par des tokens.
- Aligner `Alert` `success` et `Badge` `green` sur `--color-success`.
- Migrer d'abord les 12 composants du kit, puis les pages.

### 3.2 Typographie

- Rôles : `--font-display` (Bangers) et `--font-body` (police du texte courant, à choisir) ;
  les polices de personnage restent telles quelles.
- Échelle : tailles nommées dans `@theme` (`--text-title-1`, `--text-title-2`, `--text-body`,
  `--text-caption`...) qui reprennent les `clamp()` actuels de `Title` et des boutons.
- Ajouter un niveau 3 à `Title`, ou un composant `Text` pour le texte courant.

### 3.3 Icônes

- Créer `src/components/ui/icons/` : une dizaine de composants SVG dessinés par l'équipe
  (le sujet dit « custom-made »), en `currentColor` pour suivre la couleur du texte, avec une
  prop `size`, exportés par `src/components/ui/index.ts`.
- Couvrir les besoins actuels : flèches gauche et droite (remplacent `←` et `→`), étoile
  pleine et vide (remplacent `★` et `☆`), envoyer (chat), vote, utilisateur, amis,
  déconnexion, fermer (modale), alerte, chronomètre.

### 3.4 Utiliser le kit partout

- Remplacer les `<button>` et `<input>` bruts listés en 2.5 par `Button` et `Input`, là où le
  rendu le permet (les portraits cliquables du vote peuvent rester spécifiques).
- Faire passer les pages listées en 2.5 sur le kit (`Card`, `Title`, `Alert`...).
- `Button` et `ButtonLink` dupliquent les mêmes classes de variantes et de tailles : les
  mettre en commun.
- `src/components/TimerBunny.tsx` n'est importé nulle part : c'est un doublon de
  `src/components/game/animations/TimerBunny.tsx`, à supprimer.

### 3.5 Documenter

- Une page vitrine `/design-system` qui montre la palette, la typographie, les icônes et chaque
  composant avec ses variantes : c'est le support le plus simple pour la démonstration en
  évaluation.
- Et/ou un tableau récapitulatif dans le README.

### 3.6 Revendiquer

Une fois 3.1 à 3.5 terminés : ajouter le module au tableau *Summary* du README (Web, Minor,
1 pt), écrire sa section détaillée dans *Modules*, et retirer sa puce du commentaire TODO des
modules candidats.

---

## 4. Estimation

Ordre de grandeur : 1 à 1,5 jour. La palette et la migration des couleurs prennent de ½ à
1 jour, les icônes et la typographie ½ jour, la page vitrine quelques heures.
