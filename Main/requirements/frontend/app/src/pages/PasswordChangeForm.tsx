import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { changePassword, verifyCurrentPassword } from '../services/api';
import { Alert, Input } from '../components/ui';
import {
  STEP_CHANGE_FIELDS,
  STEP_VERIFY_FIELDS,
  validateAll,
  validateField,
  type FieldName,
  type FormErrors,
  type FormValues,
} from '../services/passwordChangeValidation';

// Changement de mot de passe en deux etapes, comme le veut le backend :
// 1. l'ancien mot de passe est verifie par le serveur (POST .../password/verify)
// 2. le nouveau est saisi puis confirme, et enregistre avec l'ancien
//    (PATCH .../password) : le serveur reverifie l'ancien a l'ecriture.
// Les champs sont vides apres succes, annulation ou retour a l'etape 1, et
// rien n'est stocke : ni mot de passe, ni hash.
export function PasswordChangeForm({ email }: { email: string }) {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [values, setValues] = useState<FormValues>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  // Seuls les champs "touches" (blur ou submit) affichent leur erreur :
  // pas de rouge agressif des le premier rendu de la page.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  // L'alerte globale ne sert qu'aux erreurs serveur (mauvais mot de passe
  // actuel, reseau indisponible) : les erreurs de saisie vivent sur les champs.
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function resetFields() {
    setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTouched({});
    setErrors({});
  }

  function getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  function setValue(name: FieldName, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);
    // Champ deja en erreur : on revalide en direct, le rouge disparait
    // des que la saisie redevient correcte.
    if (touched[name]) {
      const message = validateField(name, next);
      setErrors((previous) => ({ ...previous, [name]: message || undefined }));
    }
  }

  function handleBlur(name: FieldName) {
    setTouched((previous) => ({ ...previous, [name]: true }));
    const message = validateField(name, values);
    setErrors((previous) => ({ ...previous, [name]: message || undefined }));
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = getAccessToken();

    if (!accessToken) {
      navigate('/login');
      return;
    }

    setServerError('');
    setSuccessMessage('');

    // Etape 1 : seul le mot de passe actuel est valide.
    const nextErrors = validateAll(values, STEP_VERIFY_FIELDS);
    setTouched({ currentPassword: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsChecking(true);

    try {
      await verifyCurrentPassword(accessToken, values.currentPassword);
      setStep(2);
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred');
      }
    } finally {
      setIsChecking(false);
    }
  }

  async function handleChangeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = getAccessToken();

    if (!accessToken) {
      navigate('/login');
      return;
    }

    setServerError('');
    setSuccessMessage('');

    // Etape 2 : nouveau mot de passe et confirmation. Une confirmation
    // incorrecte vit sur le champ de confirmation, pas en alerte globale.
    const nextErrors = validateAll(values, STEP_CHANGE_FIELDS);
    setTouched({ newPassword: true, confirmPassword: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);

    try {
      await changePassword(accessToken, values.currentPassword, values.newPassword);
      setStep(1);
      resetFields();
      setSuccessMessage('Password updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setStep(1);
    resetFields();
    setServerError('');
    setSuccessMessage('');
  }

  return (
    <form
      className="border-t border-abyss-700 pt-8"
      onSubmit={step === 1 ? handleVerifySubmit : handleChangeSubmit}
      noValidate
    >
      <h2 className="mb-5 text-2xl font-semibold text-white">
        Change password
      </h2>

      {/* Champ username masque : sans lui Chromium signale "Password forms
          should have username fields" et les gestionnaires de mots de passe
          ne peuvent pas rattacher le mot de passe au compte. */}
      <input
        type="text"
        name="username"
        value={email}
        autoComplete="username"
        hidden
        readOnly
      />

      {serverError && (
        <Alert variant="error" className="mb-6">{serverError}</Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-6">{successMessage}</Alert>
      )}

      {step === 1 ? (
        <>
          <div>
            <Input
              id="current-password"
              type="password"
              label="Current password"
              value={values.currentPassword}
              onChange={(event) => setValue('currentPassword', event.target.value)}
              onBlur={() => handleBlur('currentPassword')}
              error={touched.currentPassword ? errors.currentPassword : undefined}
              minLength={8}
              maxLength={100}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="mt-6 w-full rounded-lg bg-azur-500 px-4 py-3 font-semibold text-abyss-900 transition hover:bg-azur-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Continue'}
          </button>
        </>
      ) : (
        <>
          <div>
            <Input
              id="new-password"
              type="password"
              label="New password"
              value={values.newPassword}
              onChange={(event) => setValue('newPassword', event.target.value)}
              onBlur={() => handleBlur('newPassword')}
              error={touched.newPassword ? errors.newPassword : undefined}
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
            />

            <p className="mt-2 text-sm text-abyss-500">
              8 to 72 characters.
            </p>
          </div>

          <div className="mt-5">
            <Input
              id="confirm-password"
              type="password"
              label="Confirm new password"
              value={values.confirmPassword}
              onChange={(event) => setValue('confirmPassword', event.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-6 w-full rounded-lg bg-azur-500 px-4 py-3 font-semibold text-abyss-900 transition hover:bg-azur-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save new password'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="mt-2 w-full rounded-lg border border-abyss-700 px-4 py-3 font-semibold text-abyss-300 transition hover:bg-abyss-800"
          >
            Cancel
          </button>
        </>
      )}
    </form>
  );
}
