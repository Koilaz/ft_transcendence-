// Validation du formulaire d'inscription, fidele au DTO du backend
// (register.dto.ts) : le front refuse avant l'appel reseau ce que le
// serveur refuserait de toute facon, y compris le charset du username
// que la validation native du navigateur ignore.

export type FieldName = 'username' | 'email' | 'password' | 'confirmPassword';

export type FormValues = Record<FieldName, string>;

export type FormErrors = Partial<Record<FieldName, string>>;

export const FIELD_NAMES: FieldName[] = ['username', 'email', 'password', 'confirmPassword'];

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
// Aligne sur @IsEmail() du backend (validator.js, options par defaut),
// verifie cas par cas contre l'API live :
// - partie locale en dot-atom : atomes separes par des points simples, pas
//   de point en debut/fin ni double (a.@5.zz, .a@ ou a..b@ sont refuses),
//   caracteres Unicode acceptes comme au backend ;
// - domaine : labels alphanumeriques avec tirets internes (un chiffre en
//   debut de label est accepte : a@5.zz), pas de label vide ni de tiret en
//   bordure, TLD alphabetique d'au moins 2 lettres (a@b.5 ou a@b.c refuses).
const EMAIL_PATTERN = /^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+(?:\.[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/u;

// Regle email partagee par register et login (le backend applique le meme
// @IsEmail des deux cotes).
export function validateEmail(rawEmail: string): string {
  const email = rawEmail.trim();
  if (!email) return 'Email is required';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address';
  return '';
}

export function validateField(name: FieldName, values: FormValues): string {
  // Le backend trim username et email, mais pas le mot de passe.
  const raw = values[name];
  const value = name === 'username' || name === 'email' ? raw.trim() : raw;

  switch (name) {
    case 'username':
      if (!value) return 'Username is required';
      if (value.length < 3 || value.length > 20) return 'Username must be 3 to 20 characters';
      if (!USERNAME_PATTERN.test(value)) return 'Only letters, numbers and underscores';
      return '';
    case 'email':
      return validateEmail(raw);
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      return '';
    case 'confirmPassword':
      if (!value) return 'Confirm your password';
      if (value !== values.password) return 'Passwords do not match';
      return '';
  }
}

export function validateAll(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  for (const name of FIELD_NAMES) {
    const message = validateField(name, values);
    if (message) errors[name] = message;
  }
  return errors;
}
