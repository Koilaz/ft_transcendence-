# Incohérences et anomalies relevées

> Journal d'audit du repo (branche `dev-frontend`), rédigé le 2026-09-28.
> Chaque entrée : zone concernée, constat, gravité, correction suggérée.
> À compléter au fil des découvertes — ce fichier est fait pour vivre.

## Anomalies ouvertes

### 1. Avatars : les anciens fichiers ne sont jamais supprimés

- **Zone** : backend, `auth.controller.ts` (upload) + service users.
- **Constat** : chaque upload crée `uploads/avatars/<uuid>.<ext>` (diskStorage,
  nom aléatoire) et écrase `avatarUrl` en base. Aucun `unlink` nulle part :
  l'ancien fichier reste sur le disque indéfiniment.
- **Gravité** : mineure (fuite disque lente).
- **Correction suggérée** : avant l'écriture en base, si l'utilisateur avait
  déjà un `avatarUrl` local (fichier sous `/app/uploads/avatars/`), le
  supprimer. Quelques lignes dans le service. Ne pas supprimer les avatars
  par défaut servis par le frontend (`DEFAULT_AVATAR_URL`).

### 2. Upload d'avatar : durcissement contre les fichiers malveillants

- **Zone** : backend, `auth.controller.ts`, `fileFilter` de l'avatar + nginx
  (service des fichiers).
- **Constat** : le filtre lit `file.mimetype` (déclaré par le client). Un
  fichier quelconque renommé en `.png` passe. Aucune vérification de la
  signature réelle (magic bytes). Le socle existant est sinon correct : JWT
  exigé, liste blanche JPEG/PNG/WebP, 2 Mo, nom UUID généré serveur (pas de
  traversée de chemin), extension dérivée de la liste blanche.
- **Gravité** : moyenne — la validation côté client n'a aucune valeur
  (n'importe qui parle directement à l'API).
- **Mesures recommandées**, par valeur décroissante :

  | # | Mesure | Contre quoi | Effort |
  |---|---|---|---|
  | 1 | **Ré-encoder l'image avec `sharp`** (décoder puis ré-encoder : toute métadonnée, payload en chunk ou polyglot est détruit). Bonus : supprime l'**EXIF GPS** (photos de téléphone = coordonnées — cohérent avec notre page PrivacyPolicy) et permet de rejeter les dimensions absurdes (image bomb : 2 Mo qui se décompressent en Go de pixels chez chaque client) | Faux fichiers, polyglots, XSS par métadonnées, fuite GPS, DoS client | ~15 lignes + dépendance native dans l'image Docker |
  | 2 | **Magic bytes** : PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF…WEBP` — plan B sans dépendance du point 1 | Fichier renommé | ~10 lignes |
  | 3 | **nginx** : `add_header X-Content-Type-Options nosniff;` (+ Content-Type explicite par extension) sur la localisation qui sert `uploads/` | Sniffing de contenu : un faux PNG contenant du HTML servi au navigateur d'un autre joueur | 2 lignes de conf |
  | 4 | **Rate-limit de la route** (ThrottlerGuard, ex. 5/min/utilisateur) + suppression de l'ancien avatar (voir entrée 1) | Remplissage disque en boucle | ~5 lignes |
  | 5 | **Ne jamais accepter le SVG** (déjà le cas). Le SVG embarque du JS exécutable ; si un jour on le veut, il faudra un sanitizer dédié | XSS stocké | Rien à faire — juste ne pas céder |

- **Décision à prendre en équipe backend** : point 1 si la dépendance
  native passe dans les conteneurs, point 2 sinon. Le point 3 est quasi
  gratuit et ne devrait pas attendre.

### 3. Le game compose des phrases en français (bloquant pour l'i18n)

- **Zone** : game, `room.js` (`addSystemMessage`) — messages stockés dans
  l'historique et renvoyés tels quels par l'instantané de reconnexion.
- **Constast** : « X est déconnecté. Sa place reste réservée. », « X est
  resté muet ce tour... » — le client ne peut pas les traduire seul.
- **Gravité** : moyenne si l'i18n avance (voir `PLAN_I18N.md` §4.1).
- **Correction suggérée** : à négocier avec l'équipe backend — le serveur
  émettrait des clés + paramètres, le front compose. Décision de départ
  acceptée : messages système en fr pour l'instant.

### 4. Côté collectif : le scoreboard de fin de manche est cassé

- **Zone** : branche amont, commit `c803c80` (`fix/round/manche`).
- **Constat** : le game amont diffuse la fin de manche en
  `type: 'roundState'` avec `results`, alors que **leur propre frontend**
  traite `roundState` comme un simple statut et attend `roundTransition`
  pour le tableau des scores. Chez eux, le scoreboard ne s'affiche pas.
- **Gravité** : forte chez eux ; sans effet ici (nous avons gardé
  `roundTransition`, vérifié en partie réelle).
- **Action** : à leur signaler. Ne pas répercuter leur `roundState` chez
  nous sans adapter le frontend en même temps.

### 5. `dist/` versionnés (frontend et backend)

- **Zone** : `frontend/app/dist/` et `backend/app/dist/` suivis par git.
- **Constat** : les builds sont commités. Conséquences : diffs gigantesques
  à chaque build, conflits inévitables à deux, et un `dist` backend qui peut
  être obsolète par rapport au `src` (l'exécution en prod repose dessus).
  Le commit `e1306b3` a déjà eu à « retirer les secrets du suivi git » —
  même famille de problème.
- **Gravité** : moyenne (hygiène de repo).
- **Correction suggérée** : `.gitignore` sur les deux `dist/`, `git rm -r
  --cached`, build dans l'image Docker plutôt qu'en commit. À faire d'un
  commun accord avec l'équipe pour éviter un conflit de workflow.

### 6. nginx vise des IP figées : 502 après recréation des services

- **Zone** : `nginx/` (configuration) + docker compose.
- **Constat** : nginx résout `frontend`/`backend` au démarrage et garde les
  IP. Recréer les conteneurs sans redémarrer nginx → IP périmées → 502 sur
  tout (constaté le 2026-09-28 : frontend et backend avaient échangé leurs
  IP). `docker restart nginx` répare.
- **Gravité** : moyenne (piège récurrent).
- **Correction suggérée** : dans la conf nginx, `resolver 127.0.0.11
  valid=10s;` et un `proxy_pass http://$upstream;` via variable pour forcer
  la re-résolution. Ou, plus simple : toujours redémarrer nginx après
  `make re` (l'ajouter au Makefile).

### 7. Fichiers `.backup` traînant dans `src/`

- **Zone** : `frontend/app/src/pages/` — `Home.tsx.backup2`,
  `Login.tsx.backup`, `Profile.tsx.backup`.
- **Constat** : copies mortes de vieux fichiers, toujours dans l'arbre (non
  compilées car extension `.backup`, mais trouvées par les greps, le
  comportement de l'IDE et source de confusion).
- **Gravité** : mineure (hygiène).
- **Correction suggérée** : les supprimer — git est l'historique, un fichier
  `.backup` dans `src/` n'a pas de raison d'être.

## Points vérifiés sans problème (pour ne pas re-vérifier)

- **Secrets** : la clé API Mistral et le JWT secret vivent dans
  `Main/secrets/` (ignoré par `.gitignore`, jamais commité — l'historique
  complet contient uniquement des placeholders). `secrets_example/` sert de
  gabarit.
- **Cohérence avatar front/back** : « JPEG, PNG or WebP — maximum 2 MB »
  affiché côté Profile = exactement ce que le backend impose (mimetypes + 2 Mo).
- **Personnages vs capacité** : 6 personnages pour `maxPlayers: 6`, aucun
  joueur ne peut rester sans personnage ; la synchronisation backend/game a
  préservé ces valeurs locales.

## Résolus pendant la session du 2026-09-28 (pour mémoire)

- Indicateur de manche codé en dur (« Round x/5 ») alors que la config
  serveur est à 4 → désormais piloté par `current_manche`/`max_manches`.
- `Home.tsx` ouvrait sa propre socket de présence en plus de `Friends.tsx`
  → la socket appartient désormais à `App.tsx`, les pages s'abonnent.
- Le message `voteRegistered` manquait dans l'union `GameMessage` de
  `types/game.ts` (invisible à cause du `@ts-nocheck`).
- Le message de fin de manche du game synchronisé (`roundState`) ne
  correspondait pas au frontend → gardé en `roundTransition`.
