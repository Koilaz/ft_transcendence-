# Renforcement de la securite : limitation de debit (anti brute-force)

## Contexte

Aucune limitation de debit n'existait : `POST /api/auth/login` et
`POST /api/auth/register` pouvaient etre martelees a cadence illimitee.
Un brute-force de mots de passe (ou d'emails a l'inscription) n'etait
freine par rien. Le backend utilise bcrypt (cout 12), qui est lent, mais
la seule limite etait le CPU du container.

## Ce qui a change

`requirements/nginx/conf/nginx.conf` — deux zones `limit_req` au niveau
`http`, appliquees dans trois locations :

```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m   rate=10r/m;
limit_req_zone $binary_remote_addr zone=avatar_limit:10m  rate=6r/m;
limit_req_status 429;
```

| Location | Zone | Sens |
|---|---|---|
| `/api/auth/login` | auth_limit | 10 essais/min/IP, rafale de 5 toleree (`nodelay`) |
| `/api/auth/register` | auth_limit | idem, compte partage avec login |
| `/api/auth/me/avatar` | avatar_limit | 6 uploads/min/IP, rafale de 3 |

Le compteur est par IP (`$binary_remote_addr`) : tous les clients passent
par nginx, qui voit la vraie IP (pas de LB intermediaur). Le depassement
repond **429 Too Many Requests**.

Pourquoi la rafale : `rate` seul (=10/min = 1 toutes les 6 s) ferait
echouer un utilisateur legitime qui se trompe deux fois de suite ; le
`burst=5 nodelay` laisse passer 6 requetes d'affilee puis bloque.

## Comment verifier

```bash
# 10 requetes rapides : 6 passent, puis 429
for i in $(seq 1 10); do
  curl -sk -o /dev/null -w "%{http_code} " -X POST https://localhost:8443/api/auth/login
done
# attendu : 502/200 502/200 ... puis 429 429 429 429
# (502 si le backend est arrete ; ce qui compte est le passage a 429)
```

## Limites connues

- compteur par IP : plusieurs derriere la meme IP partage (ex. ecole)
  le meme quota ;
- le `burst` permet 10 essais/min tout compris : un attaquant distribue
  reste limité par IP mais un attaquant patient fait quand meme ~14 400
  essais/jour/IP. C'est le seuil classique d'un `fail2ban`, pas mis en
  place ici.
