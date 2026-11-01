# Renforcement de la securite : politique de mots de passe et enumeration

## Contexte

Deux faiblesses restaient :

1. **Politique de mots de passe** : seule la longueur etait verifiee
   (8-100 a l'inscription, 8-72 au changement). `12345678` etait accepte ;
2. **Enumeration de comptes a l'inscription** : `POST /api/auth/register`
   repondait `409 "Username already in use"` ou `409 "Email already in
   use"` selon le cas — un attaquant pouvait cartographier les comptes
   existants en soumettant des usernames. (Le login, lui, etait deja
   correct : message uniforme `Invalid credentials`.)

## Ce qui a change

### 1. Politique de mots de passe : au moins une lettre et un chiffre

Backend, `register.dto.ts` (champ `password`) et
`change-password.dto.ts` (champ `newPassword`) :

```ts
@Matches(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
@Matches(/\d/,       { message: 'Password must contain at least one digit' })
```

Frontend, memes regles pour refuser avant l'appel reseau (les fichiers
revendiquent d'etre "fideles au DTO du backend") :

- `registerValidation.ts` (case `password`)
- `passwordChangeValidation.ts` (case `newPassword`)

`12345678` est maintenant refuse partout. Le changement de mot de passe
demande le mot de passe actuel (`currentPassword`) : il n'est soumis a
cette regle que s'il satisfait les regles du moment de sa creation.

### 2. Message generique a l'inscription

`auth.service.ts` : les deux pre-checks et le fallback `P2002`
renvoient tous desormais le meme message :

```
409 "Username or email already in use"
```

Un attaquant ne sait plus **quoi** existe — seulement que quelque chose
existe deja. Le prix : un utilisateur legitime ne sait plus quel champ
corriger, d'ou l'importance de la validation cote front qui continue de
verifier le format avant soumission.

## Tests

Les tests backend ont ete mis a jour : `password-change.test.cjs`
utilisait `'new-password'` comme nouveau mot de passe (sans chiffre) —
remplace par des mots de passe conformes. **11/11 tests passent**.

## Comment verifier

```bash
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.test","password":"12345678"}'
# attendu : 400 "Password must contain at least one letter"
```

## Limites connues

- pas de verification contre une liste de mots de passe courants
  (`rockyou`, haveibeenpwned) : `Password1` reste accepte ;
- un compte existant reste detectable par le 409 generique (on ne peut
  pas le cacher totalement sans verifier par email).
