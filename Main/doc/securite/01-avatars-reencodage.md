# Renforcement de la securite : re-encodage des avatars

## Contexte

Les avatars sont uploades par les utilisateurs via `PATCH /api/auth/me/avatar`
et stockes sur disque (`/app/uploads/avatars`), puis servis par nginx en
statique sur `/uploads/`. Ces fichiers viennent d'Internet : ils ne doivent
jamais etre servis tels quels.

## Ce qui etait deja en place

- allowlist de mimetypes : jpeg, png, webp uniquement (le SVG est interdit,
  c'est un vecteur XSS classique) ;
- limite de taille : 2 Mo cote multer ET `client_max_body_size 2M` cote
  nginx ;
- nom de fichier genere cote serveur : `randomUUID()` — le client ne
  controle ni le nom ni le chemin, donc pas de path traversal ;
- nginx sert `/uploads/` en statique pur : rien n'est execute.

## Le probleme

Le `fileFilter` de multer ne verifie que le mimetype **declare par le
client** dans le multipart. Ce header ne prouve rien : on peut envoyer
n'importe quels octets avec un `Content-Type: image/png`. Un fichier
"polyglot" (des octets valides a la fois comme script et comme image,
payload cache dans les metadonnees EXIF ou apres le marqueur EOF) passait
donc le filtre et etait stocke puis servi tel quel.

Par ailleurs, un PNG de 2 Mo peut se decoder en une image de plusieurs
gigaoctets de RAM (decompression bomb) : la limite de taille du fichier ne
borne pas la taille des pixels.

## Ce qui a change

`backend/app/src/auth/auth.controller.ts` (route `updateAvatar`) :

1. multer pose toujours le fichier recu en **temporaire** (meme allowlist,
   meme limite de 2 Mo, nom randomUUID) ;
2. `sharp` (ajoute au `package.json`, `^0.34.4`) **decode puis re-ecrit**
   l'image en WebP propre sous un nouveau nom randomUUID ;
3. dimensions bornees : `resize({ width: 512, height: 512, fit: 'inside',
   withoutEnlargement: true })` ;
4. si le decodage echoue (ce n'est pas une vraie image) : reponse
   **400 "Invalid image file"** ;
5. dans tous les cas (reussite ou echec), le fichier brut envoye par le
   client est **supprime** (`finally { unlink(...) }`).

## Pourquoi c'est suffisant

- le **re-encodage** decode l'image pixel par pixel puis la re-ecrit depuis
  zero : tout ce qui n'est pas des pixels (payload polyglot, EXIF malicieux,
  donnees cachees apres l'EOF) est detruit ;
- le **cap 512x512** arrete les decompression bombs : quelle que soit la
  taille declaree du fichier, l'image produite est petite ;
- le nom et l'extension ne viennent jamais du client ;
- le format final est uniforme (WebP), le mimetype servi par nginx est donc
  toujours `image/webp`.

## Comment verifier

Upload d'un fichier non-image avec un faux type :

```bash
curl -k -X PATCH https://<domaine>/api/auth/me/avatar \
  -H "Authorization: Bearer <JWT>" \
  -F "avatar=@script.php;type=image/png"
# attendu : 400 Invalid image file
```

Test du re-encodage directement dans le container backend ( PNG 1x1 +
polyglot PHP/PNG ) :

```bash
docker run --rm --entrypoint node <image-backend> -e "
const sharp = require('sharp'); const fs = require('fs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('/tmp/ok.png', png);
fs.writeFileSync('/tmp/fake.png', '<?php echo 1; ?>' + png.toString('binary'));
sharp('/tmp/ok.png').webp().toFile('/tmp/out.webp').then(() => console.log('re-encodage OK'));
sharp('/tmp/fake.png').webp().toFile('/tmp/x.webp').catch((e) => console.log('polyglot rejete:', e.message));
"
```

## Limites connues

- les avatars uploades **avant** ce changement restent sur disque en
  `.jpg`/`.png` : ils continuent d'etre servis (nginx ne les execute pas),
  mais ils n'ont pas ete re-encodes. Une passe de re-encodage des anciens
  fichiers est possible si besoin ;
- les nouvelles images sont toutes stockees en WebP : tous les navigateurs
  actuels le supportent.
