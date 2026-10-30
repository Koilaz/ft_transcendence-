// Validation du changement de mot de passe, fidele aux DTO du backend
// (change-password.dto.ts) :
// - etape 1 (verification) : VerifyPasswordDto, mot de passe actuel 8-100
//   caracteres, sans limite d'octets (un mot de passe long mais valide doit
//   etre accepte, bcrypt tronque seulement a la comparaison) ;
// - etape 2 (changement) : ChangePasswordDto, nouveau mot de passe 8-72
//   caracteres et 72 octets max (bcrypt ignore les octets au-dela du 72e),
//   confirmation identique.
// Les erreurs serveur (mauvais mot de passe actuel, reseau indisponible)
// restent en alerte globale : les erreurs de saisie vivent sur les champs.

export type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export type FormValues = Record<FieldName, string>;

export type FormErrors = Partial<Record<FieldName, string>>;

// Champs valides a chaque etape : la verification ne porte que sur le mot
// de passe actuel, le changement sur le nouveau et sa confirmation.
export const STEP_VERIFY_FIELDS: FieldName[] = ['currentPassword'];

export const STEP_CHANGE_FIELDS: FieldName[] = ['newPassword', 'confirmPassword'];

const FIELD_NAMES: FieldName[] = [...STEP_VERIFY_FIELDS, ...STEP_CHANGE_FIELDS];

// Le backend ne trim pas les mots de passe.
function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function validateField(name: FieldName, values: FormValues): string {
  const value = values[name];

  switch (name) {
    case 'currentPassword':
      if (!value) return 'Current password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      if (value.length > 100) return 'Password must be at most 100 characters';
      return '';
    case 'newPassword':
      if (!value) return 'New password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      if (value.length > 72) return 'Password must be at most 72 characters';
      // Le backend refuse au-dela de 72 octets (IsByteLength) : un accent
      // compte double, un mot de passe peut faire 72 caracteres mais plus.
      if (byteLength(value) > 72) return 'Password must be at most 72 bytes (accented characters count double)';
      return '';
    case 'confirmPassword':
      if (!value) return 'Confirm your password';
      if (value !== values.newPassword) return 'Passwords do not match';
      return '';
  }
}

export function validateAll(values: FormValues, fields: FieldName[] = FIELD_NAMES): FormErrors {
  const errors: FormErrors = {};
  for (const name of fields) {
    const message = validateField(name, values);
    if (message) errors[name] = message;
  }
  return errors;
}
