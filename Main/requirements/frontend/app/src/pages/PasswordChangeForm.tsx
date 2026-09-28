// @ts-nocheck
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { changePassword, verifyCurrentPassword } from '../services/api';

// Changement de mot de passe en deux etapes, comme le veut le backend :
// 1. l'ancien mot de passe est verifie par le serveur (POST .../password/verify)
// 2. le nouveau est saisi puis confirme, et enregistre avec l'ancien
//    (PATCH .../password) : le serveur reverifie l'ancien a l'ecriture.
// Les champs sont vides apres succes, annulation ou retour a l'etape 1, et
// rien n'est stocke : ni mot de passe, ni hash.
export function PasswordChangeForm() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function resetFields() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  function getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = getAccessToken();

    if (!accessToken) {
      navigate('/login');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsChecking(true);

    try {
      await verifyCurrentPassword(accessToken, currentPassword);
      setStep(2);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
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

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      await changePassword(accessToken, currentPassword, newPassword);
      setStep(1);
      resetFields();
      setSuccessMessage('Password updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setStep(1);
    resetFields();
    setError('');
    setSuccessMessage('');
  }

  return (
    <form
      className="border-t border-stone-700 pt-8"
      onSubmit={step === 1 ? handleVerifySubmit : handleChangeSubmit}
    >
      <h2 className="mb-5 text-2xl font-semibold text-white">
        Change password
      </h2>

      {error && (
        <p className="mb-6 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="mb-6 rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </p>
      )}

      {step === 1 ? (
        <>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-stone-300"
              htmlFor="current-password"
            >
              Current password
            </label>

            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              minLength={8}
              maxLength={100}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="mt-6 w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Continue'}
          </button>
        </>
      ) : (
        <>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-stone-300"
              htmlFor="new-password"
            >
              New password
            </label>

            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
            />

            <p className="mt-2 text-sm text-stone-500">
              8 to 72 characters.
            </p>
          </div>

          <div className="mt-5">
            <label
              className="mb-2 block text-sm font-medium text-stone-300"
              htmlFor="confirm-password"
            >
              Confirm new password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-6 w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save new password'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="mt-2 w-full rounded-lg border border-stone-700 px-4 py-3 font-semibold text-stone-300 transition hover:bg-stone-800"
          >
            Cancel
          </button>
        </>
      )}
    </form>
  );
}
