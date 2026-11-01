# Renforcement de la securite : identifiants entiers bornes (int4)

## Contexte

Les identifiants d'utilisateurs finissent dans des colonnes Prisma `Int`,
c'est-a-dire des **int4 PostgreSQL : un entier signe sur 32 bits**
(-2147483648 a 2147483647). Les routes friends sont les seules qui
recoivent un entier directement du client dans l'URL :

```
POST   /api/friends/:userId
PATCH  /api/friends/:userId/accept
DELETE /api/friends/:userId
```

## Le probleme

Le `ParseIntPipe` standard de NestJS ne borne **rien** :

- `"abc"` etait bien rejete en 400 ;
- mais `"2147483648"` passait le pipe (JavaScript gere les nombres jusqu'a
  2^53), atteignait la requete SQL, et PostgreSQL refusait la valeur hors
  int4 (erreur Prisma `P2020`). Cette erreur n'etait pas geree : Nest
  repondait **500 Internal Server Error**.

Ce n'etait pas une faille exploitable (pas de wraparound : la base refuse
elle-meme), mais un 500 bruite par identifiant invalide, et un
comportement non defini cote client.

## Ce qui a change

Nouveau pipe : `backend/app/src/common/pipes/bounded-int.pipe.ts`
(`BoundedIntPipe`), branche sur les trois routes dans
`friends/friends.controller.ts` a la place de `ParseIntPipe` :

- tout ce qui n'est pas un entier : **400** ;
- entier hors de l'intervalle int4 : **400** ;
- bornes exactes (2147483647, -2147483648) : passe.

Nouveau test : `backend/app/test/bounded-int.test.cjs` (Nest en memoire,
`FriendsService` mocke, vraies requetes HTTP) :

- `"5"` -> 201, le service est atteint ;
- `"abc"`, `"5.5"` -> 400 ;
- `"2147483648"`, `"-2147483649"`, `"99999999999999999999"` -> 400
  (et non 500) ;
- bornes int4 exactes -> 201.

## Piege decouvert en testant (a retenir)

Le `ValidationPipe` global (`transform: true` dans `main.ts`) convertit
**deja** les parametres de route en `number`, d'apres le type TypeScript
declare (`userId: number`), **avant** les pipes de parametre. Concretement,
`BoundedIntPipe` ne voit pas la string de l'URL mais le nombre deja
converti (et `"abc"` devient `NaN`).

Premiere version du pipe : string stricte uniquement -> tous les
identifiants valides etaient rejetes. Le pipe accepte donc les deux formes
(`number` quand le ValidationPipe est actif, `string` sinon, par exemple
dans les tests isoles). Consequence : `"0x10"` et `"1e3"` sont normalises
en `16` et `1000` par le ValidationPipe avant le pipe — c'est le
comportement standard de Nest, identique a l'ancien `ParseIntPipe`, et le
resultat reste un int4 valide.

## Comment verifier

```bash
npm test   # dans requirements/backend/app (11 tests, dont 4 pour le pipe)

# en direct, containers lances :
curl -k -X POST https://localhost:8443/api/friends/2147483648 \
  -H "Authorization: Bearer <JWT>"
# attendu : 400 (et plus 500)
```

## Limites connues

Les `userId` venant des autres chemins (JWT de la requete, results de
requetes) ne passent pas par ce pipe : ils ne viennent jamais du client
directement, donc pas de borne necessaire.
