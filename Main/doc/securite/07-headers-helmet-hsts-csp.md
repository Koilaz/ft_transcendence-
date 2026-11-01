# Renforcement de la securite : headers (helmet, HSTS, CSP, Origin WS)

## Contexte

Les reponses du site n'emportaient aucun header de securite : pas de
HSTS, pas de nosniff global (seulement sur `/uploads/`), pas de
protection clickjacking, pas de CSP sur le frontend, et les handshakes
WebSocket acceptaient n'importe quelle `Origin`.

## Ce qui a change

### 1. helmet sur le backend

`backend/app/src/main.ts` :

```ts
import helmet from 'helmet';
...
app.use(helmet());
```

Toutes les reponses du backend (JSON) partent avec les headers helmet
(X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP par
defaut, etc.). Le HTML du jeu est servi par nginx, pas par le backend :
la CSP utile au frontend est cote nginx (point 3).

### 2. Headers globaux nginx

`requirements/nginx/conf/nginx.conf`, niveau `server` :

```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
```

- **HSTS** : le navigateur refuse toute connexion http future vers le
  domaine — le site est https-only de toute facon ;
- **nosniff global** : plus seulement `/uploads/` ;
- **X-Frame-Options DENY** : le site ne peut pas etre encadre dans un
  iframe tiers (clickjacking).

### 3. CSP sur le frontend

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'" always;
```

Le site ne charge **rien d'origine externe** : aucun CDN, aucune police
distante. Tout ce qui n'est pas servi par notre domaine est bloque.

**Polices auto-hebergees** : les 7 familles (Bangers, Black Ops One,
Cinzel, MedievalSharp, Mochiy Pop P One, Orbitron, Parisienne) venaient
de Google Fonts via un `@import` dans `index.css` — ce que la premiere
version de cette CSP a casse (Bangers absente de l'ecran d'accueil).
Elles sont desormais dans `frontend/app/public/fonts/` (15 fichiers
woff2, sous-ensembles latin / latin-ext avec `unicode-range`
preserves), declares dans `frontend/app/src/fonts.css`, importe par
`index.css`. Aucune exception CSP n'est necessaire pour elles, et le
site est autonome.

**Pourquoi `'unsafe-inline'` sur script-src** : le frontend tourne sous
le serveur dev Vite (a travers nginx), qui injecte le preamble
`@react-refresh` en inline dans index.html. Une CSP stricte casserait le
HMR et le hot reload. C'est le compromis documente : la CSP bloque quand
meme toutes les origines externes ; resserrer `script-src` (retirer
`unsafe-inline`) n'est possible que sur un build de production bundle
(`vite build`), a faire si le site passe un jour en mode build.

### 4. Controle d'Origin sur les WebSockets

```nginx
if ($http_origin != "https://$http_host")
{
    return 403;
}
```

dans `/ws/presence` et `/ws/game`. Un navigateur envoie toujours le
header `Origin` sur un handshake WS : une Origin differente du site
signifie qu'un site tiers tente d'ouvrir la socket (Cross-Site
WebSocket Hijacking). C'est une defense en profondeur — le token en
query string reste de toute facon requis, et un site tiers ne peut pas
le connaitre.

Attention : les clients **non-navigateur** sans header `Origin` (scripts
de test curl/wscat) sont maintenant refuses en 403.

## Comment verifier

```bash
curl -skI https://localhost:8443/ | grep -iE "strict-transport|x-content-type|x-frame|content-security"
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:8443/ws/game
# 403 (sans Origin) ; avec -H "Origin: https://localhost:8443" -> passe
```

## Limites connues

- `unsafe-inline` en script-src affaiblit la CSP (compromis Vite dev,
  voir plus haut) ;
- `$http_host` doit correspondre a l'URL reellement utilisee (domaine
  du .env) — avec un domaine different, l'Origin suit, rien a changer.
