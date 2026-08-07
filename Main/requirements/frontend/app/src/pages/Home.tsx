import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';

import { getHealth, getUsers } from '../services/api';

type User = {
  id: number;
  username: string;
};

export default function Home() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('Loading...');
  const [users, setUsers] = useState<User[]>([]);

  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const health = await getHealth();
        const users = await getUsers();

        setStatus(health.status);
        setUsers(users);
      } catch {
        setStatus('Backend unavailable');
      }
    }

    fetchData();
  }, []);

  function handleGuestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = guestName.trim();

    if (!trimmedName) {
      return;
    }

    // Pseudo local uniquement : pas de compte, pas de token. Le service de
    // jeu n'exige d'ailleurs aucune authentification pour se connecter.
    localStorage.setItem('guestName', trimmedName);
    navigate('/game');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold">
        Transcendence
      </h1>

      <p className="text-xl">
        Backend status : <span className="text-green-400">{status}</span>
      </p>

      <div className="flex gap-4">
        <Link
          to="/register"
          className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 hover:bg-sky-400"
        >
          Register
        </Link>

        <Link
          to="/login"
          className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Login
        </Link>

        <Link
          to="/profile"
          className="rounded-lg bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-400"
        >
          Profile
        </Link>

        <Link
          to="/game"
          className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-slate-950 hover:bg-orange-400"
        >
          Partie rapide
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setIsGuestFormOpen((open) => !open)}
          className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
        >
          Continuer en invité
        </button>

        {isGuestFormOpen && (
          <form onSubmit={handleGuestSubmit} className="flex gap-2">
            <input
              type="text"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Ton pseudo"
              minLength={2}
              maxLength={20}
              required
              autoComplete="off"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none transition focus:border-sky-500"
            />

            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Jouer
            </button>
          </form>
        )}
      </div>

      <section className="w-full max-w-xl rounded-xl border border-slate-700 p-6">
        <h2 className="mb-4 text-2xl font-semibold">
          Registered users
        </h2>

        {users.length === 0 ? (
          <p className="text-slate-400">
            No users registered.
          </p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="rounded border border-slate-800 bg-slate-900 p-3"
              >
                <span className="font-semibold">
                  #{user.id}
                </span>{' '}
                — {user.username}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}