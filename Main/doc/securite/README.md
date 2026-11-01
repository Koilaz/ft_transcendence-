# Renforcement de la securite

Suite a un audit des vecteurs classiques (injections, overflows d'entiers,
images malveillantes), quatre changements ont ete apportes. Chacun est
detaille dans son fichier :

| Fichier | Sujet |
|---|---|
| `01-avatars-reencodage.md` | Avatars : re-encodage WebP via sharp (anti-polyglot, anti-decompression bomb) |
| `02-cors-restreint.md` | CORS limite a l'origine du site au lieu de toutes origines |
| `03-headers-nginx-uploads.md` | `nosniff` + CSP sandbox sur `/uploads/`, et types MIME corrects |
| `04-entiers-bornes.md` | Identifiants d'URL bornes a l'intervalle int4 (400 au lieu de 500) |
| `05-jwt-expiration.md` | JWT expire au bout de 24 h (avant : valable pour toujours) |
| `06-rate-limiting.md` | Limitation de debit sur login / register / upload avatar |
| `07-headers-helmet-hsts-csp.md` | helmet, HSTS, X-Frame-Options, CSP frontend, Origin des WS |
| `08-mots-de-passe-et-enumeration.md` | Lettre + chiffre obligatoires, message 409 generique a l'inscription |
| `09-dependances.md` | Audit npm des trois lockfiles, correctifs compatibles appliques |

Fichiers de code touches :

```
backend/app/src/auth/auth.controller.ts     (re-encodage avatar)
backend/app/src/auth/auth.service.ts        (JWT 24h, message 409 generique)
backend/app/src/auth/dto/register.dto.ts    (politique mot de passe)
backend/app/src/auth/dto/change-password.dto.ts (politique mot de passe)
backend/app/src/main.ts                     (CORS, helmet)
backend/app/src/friends/friends.controller.ts (BoundedIntPipe)
backend/app/src/common/pipes/bounded-int.pipe.ts (nouveau)
backend/app/test/bounded-int.test.cjs       (nouveau)
backend/app/test/password-change.test.cjs   (mots de passe conformes a la politique)
backend/app/package.json                    (deps sharp, helmet)
backend/app/package-lock.json               (audit fix)
frontend/app/src/services/registerValidation.ts        (politique mot de passe)
frontend/app/src/services/passwordChangeValidation.ts  (politique mot de passe)
frontend/app/src/index.css                   (@import local des polices)
frontend/app/src/fonts.css                   (nouveau, @font-face locaux)
frontend/app/public/fonts/                   (nouveau, 15 woff2 auto-heberges)
frontend/app/package-lock.json               (audit fix)
game/app/package-lock.json                  (audit fix)
nginx/conf/nginx.conf                       (headers, CSP, limit_req, mime.types, Origin WS)
```

## Ce qui etait deja conforme (verifie, pas modifie)

- **Injection SQL** : aucune requete brute (`$queryRaw` / `$executeRaw`)
  dans le code ; tout passe par Prisma, dont les requetes sont
  parametrees. A maintenir : eviter d'introduire du raw SQL sans
  `$queryRaw` parametre.
- **Injection de commandes / eval** : aucun `child_process`, `exec`,
  `spawn`, `eval` dans backend, game et frontend.
- **XSS** : le chat et les pseudos sont rendus via l'echappement natif de
  React (`{text}` dans `DialogueArea.tsx`), jamais de
  `dangerouslySetInnerHTML` ni `innerHTML`. A maintenir : bannir
  `dangerouslySetInnerHTML` du front.
- **Payload JSON malveillants** : `ValidationPipe` global avec
  `whitelist` + `forbidNonWhitelisted` -> tout champ non declare dans un
  DTO est rejete en 400.
- **Entrees WebSocket du jeu** : `gameConnections.js` valide les types
  (`typeof msg.text !== 'string'`), tronque la longueur
  (`maxMessageLength`), nettoie les pseudos invites (caracteres de
  controle supprimes, 20 caracteres max).

## Methode de verification

Chaque fichier decrit ses commandes de test (curl, `npm test`, `nginx -t`).
Les tests backend tournent via `npm test` dans `requirements/backend/app` :
11 tests (7 changement de mot de passe + 4 pipe borne).
