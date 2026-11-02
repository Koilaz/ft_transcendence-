import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register } from '../services/api';

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await register({
        username,
        email,
        password,
      });

      navigate('/login');
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <h1 className="mb-2 text-3xl font-bold">Create account</h1>

          <p className="mb-8 text-slate-400">
            Join AImpostor and create your profile.
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={20}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-sky-500"
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="email"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-sky-500"
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="password"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={100}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-sky-500"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already registered?{' '}
            <Link
              className="font-medium text-sky-400 hover:text-sky-300"
              to="/login"
            >
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}