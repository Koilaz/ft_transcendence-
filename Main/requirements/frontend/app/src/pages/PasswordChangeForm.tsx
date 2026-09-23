import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, verifyCurrentPassword } from '../services/api';
import { getAccessToken } from '../services/session';

export default function PasswordChangeForm() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmation('');
    setVerified(false);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const accessToken = getAccessToken();
    if (!accessToken) {
      reset();
      navigate('/login');
      return;
    }

    setError('');
    setSuccess('');
    if (verified && newPassword !== confirmation) {
      setError('New passwords do not match.');
      return;
    }

    setPending(true);
    try {
      if (!verified) {
        await verifyCurrentPassword(accessToken, currentPassword);
        setVerified(true);
      } else {
        await changePassword(accessToken, currentPassword, newPassword);
        reset();
        setSuccess('Password changed successfully.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to change password.');
    } finally {
      setPending(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-sky-500';

  return (
    <form className="mt-8 border-t border-slate-800 pt-8" onSubmit={handleSubmit}>
      <h2 className="mb-5 text-2xl font-semibold">Change password</h2>
      <p className="mb-4 text-sm text-slate-400">
        {verified
          ? 'Choose your new password. Use at least 8 characters.'
          : 'Enter your current password to continue.'}
      </p>

      {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
      {success && <p role="status" className="mb-4 text-sm text-emerald-300">{success}</p>}

      <fieldset disabled={pending} className="space-y-4">
        {!verified ? (
          <div key="current">
            <label htmlFor="current-password" className="mb-2 block text-sm font-medium">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              minLength={8}
              maxLength={100}
              required
              className={inputClass}
            />
          </div>
        ) : (
          <div key="new" className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                minLength={8}
                maxLength={72}
                required
                className={inputClass}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Please wait...' : verified ? 'Save new password' : 'Continue'}
        </button>
        {verified && (
          <button type="button" onClick={reset} className="w-full text-sm text-slate-400 hover:text-white">
            Cancel
          </button>
        )}
      </fieldset>
    </form>
  );
}
