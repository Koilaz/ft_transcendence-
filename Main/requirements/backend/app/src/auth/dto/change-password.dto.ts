import { IsByteLength, IsString, MaxLength, MinLength } from 'class-validator';

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
  newPassword!: string;
}
