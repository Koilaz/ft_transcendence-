# Renforcement de la securite : audit des dependances npm

## Contexte

Les trois `package-lock.json` (backend, frontend, game) n'avaient jamais
ete audites. Un scan `npm audit` initial donnait :

| App | Avant |
|---|---|
| backend | 31 vulnerabilites (4 low, 13 moderate, 13 high, **1 critical**) |
| frontend | 12 moderate |
| game | 3 (1 moderate, 1 high, **1 critical**) |

## Ce qui a ete fait

`npm audit fix --package-lock-only` puis `npm update --package-lock-only`
dans chaque app : mises a jour **compatibles uniquement** (aucune
modication de `package.json`, aucune montee de version majeure).

| App | Apres | Remarque |
|---|---|---|
| backend | 27 (4 low, 12 moderate, 11 high) | plus aucune **critical** |
| frontend | 12 moderate | inchange (voir ci-dessous) |
| game | **0** | dont la critical et la high |

Les trois images Docker se build avec les lockfiles mis a jour ; les 11
tests backend passent ; le frontend passe `tsc --noEmit`.

## Ce qui reste (documente, non corrige)

- **frontend (12 moderate)** : toutes dans la chaine dev (eslint /
  typescript-eslint / minimatch), rien n'est servi aux utilisateurs —
  corriger exige un bump majeur de `typescript-eslint` ;
- **backend (27)** : les principales concernent `body-parser` (DoS,
  corrige dans la ligne express 5), `multer` (cleanup incomplet),
  `@nestjs/core` (injection de sortie, corrige en 11.x), `glob` /
  `minimatch` (outils dev). Les corriger demande des montees majeures
  (express 5, Nest 11, multer 3) qui depassent le cadre d'un fix de
  securite : a planifier comme tache de fond, pas en urgence, car les
  vecteurs concernent des charges malicieuses gerees en amont
  (limit_req, taille limite).

## Comment verifier

```bash
# scan d'un lockfile sans rien installer :
docker run --rm -v requirements/<app>/app:/app -w /app node:22 \
  npm audit --package-lock-only
```

A relancer periodiquement (apres chaque `npm install` d'une nouvelle
dependance).
