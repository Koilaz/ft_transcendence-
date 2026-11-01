import { IsByteLength, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  currentPassword!: string;
}

export class ChangePasswordDto extends VerifyPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  // bcrypt ignore les octets au-delà du 72e : refuser une troncature silencieuse.
  @IsByteLength(0, 72, {
    message: 'New password is too long. Please use fewer characters.',
  })
  // Meme politique que l'inscription : au moins une lettre et un chiffre.
  @Matches(/[a-zA-Z]/, {
    message: 'Password must contain at least one letter',
  })
  @Matches(/\d/, {
    message: 'Password must contain at least one digit',
  })
  newPassword!: string;
}
