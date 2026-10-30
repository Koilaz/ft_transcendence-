// Validation du formulaire de connexion, fidele au DTO du backend
// (login.dto.ts) : email au format @IsEmail, mot de passe d'au moins
// 8 caracteres (un mot de passe plus court est refuse par le serveur avant
// la verification des identifiants, et aucun compte ne peut en avoir un).
// L'echec d'authentification (401 « Invalid credentials ») reste une alerte
// globale : on ne dit pas quel champ est faux.

import { validateEmail } from './registerValidation';

export type FieldName = 'email' | 'password';

export type FormValues = Record<FieldName, string>;

export type FormErrors = Partial<Record<FieldName, string>>;

export const FIELD_NAMES: FieldName[] = ['email', 'password'];

export function validateField(name: FieldName, values: FormValues): string {
  // Le backend trim l'email mais pas le mot de passe.
  const raw = values[name];
  const value = name === 'email' ? raw.trim() : raw;

  switch (name) {
    case 'email':
      return validateEmail(raw);
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
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
