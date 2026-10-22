# Plan i18n — français, anglais, arabe

> Frontend React 19 / Vite 8 / TypeScript. Document rédigé après audit du code
> (volume mesuré le 2026-09-28, branche `dev-frontend`). Aucune ligne d'i18n
> n'est encore en place : ce plan est autoporteur.

## 1. Décision : react-i18next + fichiers JSON

Librairie standard du marché, compatible React 19, ~13 KB gzippé au total
(i18next + react-i18next). On évite un dictionnaire maison (à cette échelle
ce serait viable, mais on réinventerait pluriels, interpolation, typage des
clés pour économiser 13 KB) et lingui (trop de config build pour le gain).

```
src/i18n/
├── index.ts        # config : langue du navigateur, fallback fr, persistance localStorage
└── locales/
    ├── fr.json     # { "lobby": { "ready": "Confirmer ma présence", ... } }
    ├── en.json
    └── ar.json
```

- `import './i18n'` dans `main.tsx`.
- Dans un composant : `const { t } = useTranslation()` puis `t('lobby.ready')`,
  interpolation : `t('lobby.readyCount', { count, total })`.
- Sélecteur de langue : `i18n.changeLanguage('ar')` + persister en
  `localStorage` (clé dédiée, ex. `lang`).

## 2. Volume mesuré sur le code actuel

| Zone | Volume | Remarque |
|---|---|---|
| `pages/Home.tsx` | 47 chaînes | le plus gros fichier, à faire en premier |
| `content/lore.ts` | 89 lignes | lore du Lobby : pur contenu, rien de technique |
| `PrivacyPolicy`, `Friends`, `VoteSystem`, `Profile`, `TermsOfService` | 10-14 chacun | mécanique |
| `PasswordChangeForm`, `Lobby`, `Register`, `Login`, `GameHeader` | 3-6 chacun | mécanique |
| `services/gameState.ts` | bandeau + messages du fil | voir §4.2 — refactor, pas simple extraction |
| Total | ~130 chaînes UI + lore | |

## 3. Effort estimé

| Étape | Temps |
|---|---|
| Setup (config, 3 JSON, switcher) | 2-3 h |
| Extraction fr/en (traduction comprise) | 1 à 2 jours |
| Arabe : traductions | inclus ci-dessus |
| **Arabe : passage RTL** (classes logiques + `dir="rtl"` + police supportant l'arabe + relecture des modales) | +1 jour |

Verdict : aisé. C'est mécanique et sans risque technique ; les seuls points
de conception sont en §4.

## 4. Les deux décisions de conception (spécifiques à ce code)

### 4.1 Le serveur compose des phrases en français

Les messages système sont générés côté game et stockés dans l'historique
(`Main/requirements/game/app/game/room.js`) :

- « X est déconnecté. Sa place reste réservée. »
- « X est resté muet ce tour... »

L'instantané de reconnexion les renvoie telles quelles : le client ne peut
pas les traduire seul. Deux options :

1. **Accepter** que ces lignes restent en français (UI traduite, messages
   système en fr). C'est le choix recommandé pour démarrer.
2. Faire émettre au serveur des **clés + paramètres** (changement de
   protocole game, à négocier avec l'équipe backend).

Les noms de personnages (Colonel Moutarde, etc.) restent en français de
toute façon : ce sont des noms propres, côté serveur.

### 4.2 Le reducer doit stocker des clés, pas des phrases

`getBanner` et les messages du fil dans `services/gameState.ts` contiennent
du français en dur. Pour que la langue change à chaud sans reconstruire
l'état :

- le reducer produit des items structurés :
  `{ kind: 'system', key: 'playerDisconnected', character }`
- `DialogueArea` traduit au rendu : `t(key, { character })`

Conséquence : les tests (`tests/reconnection.test.mjs`) vérifient
actuellement des textes français (`'Manche 2/4'`, `.includes('déconnecté')`) ;
ils devront vérifier des **clés** — plus robuste car indépendants de la
langue.

## 5. RTL pour l'arabe — le vrai coût

La traduction est facile ; la mise en page est le chantier :

1. **Classes Tailwind logiques** : remplacer `ml-/mr-/pl-/pr-/left-/right-`
   par `ms-/me-/ps-/pe-/start-/end-`. Tailwind v4 les gère nativement : le
   layout se mire automatiquement quand `dir="rtl"`. À faire partout dans
   `pages/` et `components/`.
2. **`document.documentElement.dir`** : `'rtl'` pour `ar`, `'ltr'` sinon,
   basculé par le sélecteur de langue.
3. **Police** : la stack actuelle doit être complétée pour l'arabe
   (ex. famille arabe déclarée en fallback).
4. **Relecture visuelle** : les modales plein écran (ScoreboardModal,
   GameEndModal) et le VoteArea sont les points sensibles.

## 6. Ordre d'implémentation

1. Setup i18next + react-i18next + `fr.json` complet (extraction depuis le
   code existant — le français est la référence).
2. `en.json` puis `ar.json` traduits.
3. Sélecteur de langue + `dir` automatique + persistance.
4. Refactor `gameState.ts` vers des clés de messages + adaptation des
   10 tests (`npm test` doit rester vert).
5. Passage RTL (classes logiques) + relecture visuelle des modales.
6. Vérifications : `tsc -b` rc=0, `node --test tests/*.test.mjs`,
   `vite build`, puis relecture des trois langues dans le navigateur
   (conteneur `frontend`, via `https://localhost:4443`).

## 7. Rappel des commandes de vérification (conteneurs, pas de node local)

```bash
# build + tests du frontend
docker run --rm --entrypoint sh -v <chemin>/frontend/app:/src -w /src frontend:local \
  -c "cp -r /app/node_modules /src/node_modules; npx tsc -b; node --test tests/*.test.mjs"
# nettoyer ensuite le node_modules créé (droits root) :
docker run --rm --entrypoint sh -v <chemin>/frontend/app:/src frontend:local \
  -c "rm -rf /src/node_modules /src/*.tsbuildinfo"
```
