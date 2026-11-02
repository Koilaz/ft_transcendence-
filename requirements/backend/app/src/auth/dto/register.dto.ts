import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Username can only contain letters, numbers and underscores',
  })
  username!: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}




// @IsString() = le champ doit être une chaîne de caractères.
// @MinLength(3) = au moins 3 caractères.
// @MaxLength(20) = au maximum 20 caractères.
// @IsEmail() = vérifie automatiquement qu'il s'agit d'un email valide le parsing est fait pour nous
// La validation est effectuée automatiquement par ValidationPipe.

// Le ! signifie :
// "Je garantis que cette propriété sera initialisée."
// Dans notre cas, c'est vrai : NestJS va construire cet objet à partir du JSON reçu dans la requête


// apres l'activation de ValidationPipe, si quelqu'un envoie :

// {
//     "username": "",
//     "email": "bonjour",
//     "password": "123"
// }

// NestJS répondra directement : 400 Bad Request

// avec un message venant de nest js plutot precis du genre :
//     "username must be longer than or equal to 3 characters",
//     "email must be an email",
//     "password must be longer than or equal to 8 characters"