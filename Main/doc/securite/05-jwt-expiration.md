# Renforcement de la securite : expiration du JWT

## Contexte

Le token d'acces etait signe sans option d'expiration :

```ts
const accessToken = await this.jwtService.signAsync({
  sub: user.id,
  username: user.username,
});
```

Un JWT sans claim `exp` est **valable pour toujours**. Un token qui fuite
(log, machine partagee, onglet partage, XSS residuel) ne peut jamais etre
invalide : le `ignoreExpiration: false` de la strategie ne servait a rien,
puisqu'il n'y avait rien a expirer.

## Ce qui a change

`backend/app/src/auth/auth.service.ts` (login) :

```ts
{
  expiresIn: (process.env.JWT_EXPIRES_IN ?? '24h') as JwtSignOptions['expiresIn'],
}
```

- duree par defaut : **24 heures** ;
- configurable via `JWT_EXPIRES_IN` dans le `.env` (syntaxe `ms` :
  `"1h"`, `"7d"`, ...) — le cast est du au type literal attendu par
  `@nestjs/jwt`.

## Consequences pour le front

Il n'y a pas de refresh token : au bout de 24 h, les appels API repondent
401 et l'utilisateur doit se reconnecter. Le token vit dans
`localStorage` (services/session.ts), donc l'expiration ne se voit qu'au
prochain appel reseau — un rechargement de page ramene a l'ecran de login
via le 401 de `/auth/me`.

## Comment verifier

```bash
# verifier le claim exp sur un token produit par le service :
docker run --rm --entrypoint node <image-backend> -e "
const { JwtService } = require('@nestjs/jwt');
new JwtService({ secret: 'x' }).signAsync({ sub: 1, username: 'a' }, { expiresIn: '24h' })
  .then((t) => {
    const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString());
    console.log('exp:', p.exp, 'duree (h):', (p.exp - p.iat) / 3600);
  });
"
```

## Limites connues

- pas de refresh token ni de liste de revocation : "logout" = suppression
  cote client, le token reste valide jusqu'a expiration s'il a ete copie ;
- reduire la duree (ex. 1h) est plus sur mais force des re-logins
  frequents pendant une partie.
