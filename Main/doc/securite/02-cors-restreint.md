# Renforcement de la securite : CORS restreint a l'origine du site

## Contexte

Le backend NestJS activait le CORS avec la configuration par defaut :

```ts
app.enableCors();
```

Sans options, cela signifie **toutes les origines autorisees** : n'importe
quel site visite par un utilisateur connecte pouvait faire des requetes
vers notre API et en lire les reponses (le JWT n'etait certes pas envoyable
sans credence, mais la porte etait inutilement ouverte).

## Ce qui a change

`backend/app/src/main.ts` :

```ts
const domainName = process.env.DOMAIN_NAME ?? 'localhost';
const nginxPort = process.env.NGINX_PORT ?? '8443';

app.enableCors({
  origin: `https://${domainName}:${nginxPort}`,
});
```

Les variables `DOMAIN_NAME` et `NGINX_PORT` viennent du `.env`, deja passe
au container backend par `env_file` dans `docker-compose.yml`.

## Pourquoi c'est correct ici

- tout le trafic navigateur passe par nginx : le frontend appelle `/api/...`
  en chemin relatif, donc **same-origin**. Il n'y a en pratique besoin
  d'aucune origine cross-origin ;
- les WebSockets (`/ws/presence`, `/ws/game`) ne sont pas concernes : la
  politique CORS ne s'applique pas au handshake WebSocket ;
- le JWT est transporte dans un header, pas dans un cookie de session : le
  CSRF n'est pas applicable non plus, mais fermer le CORS supprime une
  classe entiere de questions.

## Comment verifier

```bash
# bonne origine -> header Access-Control-Allow-Origin present
curl -k -H "Origin: https://localhost:8443" -I https://localhost:8443/api/health

# mauvaise origine -> pas de header Access-Control-Allow-Origin
curl -k -H "Origin: https://evil.example" -I https://localhost:8443/api/health
```

## Limites connues

Si un jour on developpe en acces direct cross-origin (par exemple front sur
`localhost:5173` qui appelle `localhost:3000` sans passer par nginx), il
faudra ajouter cette origine de dev explicitement dans le tableau `origin`.
