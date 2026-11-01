# Renforcement de la securite : headers nginx sur /uploads/

## Contexte

`/uploads/` sert des fichiers uploades par des utilisateurs. Deux
comportements de navigateur rendaient cette zone sensible :

1. le **reniflage MIME** : si le type declare ne lui plait pas, le
   navigateur peut decider seul d'en interpreter un autre ;
2. un fichier polyglot (valide a la fois comme HTML/script et comme autre
   chose) ouvert directement peut etre rendu comme page.

Le re-encodage cote backend (voir `01-avatars-reencodage.md`) est la
premiere barriere ; les headers sont la **defense en profondeur** : ils
restent utiles le jour ou un autre type de fichier serait servi de cette
zone, ou si une regression reintroduit un fichier brut.

## Ce qui a change

`requirements/nginx/conf/nginx.conf`, bloc `location /uploads/` :

```nginx
add_header X-Content-Type-Options nosniff always;
add_header Content-Security-Policy "default-src 'none'; sandbox" always;
```

- `X-Content-Type-Options: nosniff` — le navigateur interdit de renifler :
  un fichier declare `image/webp` ne sera jamais interprete comme autre
  chose ;
- `Content-Security-Policy: default-src 'none'; sandbox` — si le fichier
  etait rendu comme document, aucun script, aucune requete, aucune
  navigation ne serait permis. C'est la CSP la plus restrictive qui soit ;
- `always` — les headers sont emis aussi sur les reponses d'erreur (4xx/5xx).

Et, dans le bloc `http` (correctif lie) :

```nginx
include /etc/nginx/mime.types;
default_type application/octet-stream;
```

**Pourquoi c'etait indispensable avec nosniff** : sans `mime.types`, nginx
sert tout en `text/plain`. Un navigateur moderne (regle ORB) refuse une
image declaree `text/plain` quand `nosniff` est actif : les avatars auraient
pu cesser de s'afficher. Avec `mime.types`, un `.webp` est bien servi en
`image/webp` et un `.png` en `image/png`.

A noter egalement : le couple `location /uploads/` + `alias
/app/uploads/;` (les deux termines par un slash) est la forme safe de
l'alias nginx. La variante sans slash final dans `location` est la classique
faille de path traversal (`/uploads../etc/passwd`) ; ici ce motif ne matche
pas la location et part vers le frontend.

## Comment verifier

```bash
curl -kI https://localhost:8443/uploads/avatars/<uuid>.webp
# attendu :
#   Content-Type: image/webp
#   X-Content-Type-Options: nosniff
#   Content-Security-Policy: default-src 'none'; sandbox
```

Valider la configuration apres modification :

```bash
# dans le container nginx (l'entrypoint le fait aussi au demarrage)
nginx -t
```
