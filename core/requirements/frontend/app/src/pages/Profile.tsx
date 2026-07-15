import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  DEFAULT_AVATAR_URL,
  getMe,
  updateMe,
  uploadAvatar,
  type User,
} from '../services/api';

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] =
    useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] =
    useState(false);

  useEffect(() => {
    async function loadProfile() {
      const accessToken =
        localStorage.getItem('accessToken');

      if (!accessToken) {
        navigate('/login');
        return;
      }

      try {
        const profile = await getMe(accessToken);

        setUser(profile);
        setUsername(profile.username);
      } catch (error) {
        localStorage.removeItem('accessToken');

        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [navigate]);

  async function handleAvatarSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accessToken =
      localStorage.getItem('accessToken');

    if (!accessToken) {
      navigate('/login');
      return;
    }

    if (!avatarFile) {
      setError('Please select an avatar');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsUploadingAvatar(true);

    try {
      const updatedUser = await uploadAvatar(
        accessToken,
        avatarFile,
      );

      setUser(updatedUser);
      setAvatarFile(null);
      setSuccessMessage('Avatar updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accessToken =
      localStorage.getItem('accessToken');

    if (!accessToken) {
      navigate('/login');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const updatedUser = await updateMe(
        accessToken,
        {
          username,
        },
      );

      setUser(updatedUser);
      setUsername(updatedUser.username);
      setSuccessMessage('Profile updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken');
    navigate('/login');
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading profile...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-md rounded-2xl border border-red-900 bg-red-950 p-6">
          <h1 className="mb-3 text-2xl font-bold">
            Unable to load profile
          </h1>

          <p className="mb-6 text-red-300">
            {error || 'User not found'}
          </p>

          <Link
            to="/login"
            className="inline-block rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400"
          >
            Return to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm uppercase tracking-widest text-sky-400">
                Profile
              </p>

              <h1 className="text-4xl font-bold">
                {user.username}
              </h1>
            </div>

            <div className="flex gap-3">
              <Link
                to="/friends"
                className="rounded-lg border border-sky-500 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-500/10"
              >
                Friends
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-red-500 hover:text-red-300"
              >
                Log out
              </button>
            </div>
          </div>

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

          <div className="mb-8 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-500">
                User ID
              </p>

              <p className="mt-1 text-lg">
                {user.id}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-500">
                Email
              </p>

              <p className="mt-1 text-lg">
                {user.email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="mb-3 text-sm text-slate-500">
                Avatar
              </p>

              <img
                src={user.avatarUrl ?? DEFAULT_AVATAR_URL}
                alt={`Avatar de ${user.username}`}
                className="h-32 w-32 rounded-full object-cover"
              />
            </div>
          </div>

          <form
            className="mb-8 border-t border-slate-800 pt-8"
            onSubmit={handleAvatarSubmit}
          >
            <h2 className="mb-5 text-2xl font-semibold">
              Change avatar
            </h2>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file =
                  event.target.files?.[0] ?? null;

                setAvatarFile(file);
              }}
              className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
            />

            <p className="mt-2 text-sm text-slate-500">
              JPEG, PNG or WebP — maximum 2 MB.
            </p>

            <button
              type="submit"
              disabled={
                !avatarFile ||
                isUploadingAvatar
              }
              className="mt-6 w-full rounded-lg bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploadingAvatar
                ? 'Uploading...'
                : 'Upload avatar'}
            </button>
          </form>

          <form
            className="border-t border-slate-800 pt-8"
            onSubmit={handleProfileSubmit}
          >
            <h2 className="mb-5 text-2xl font-semibold">
              Edit profile
            </h2>

            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="username"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                minLength={3}
                maxLength={20}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                username.trim() === user.username
              }
              className="mt-6 w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : 'Save changes'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}