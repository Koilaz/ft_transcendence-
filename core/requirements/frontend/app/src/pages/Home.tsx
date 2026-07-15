import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { getHealth, getUsers } from '../services/api';

type User = {
  id: number;
  username: string;
};

export default function Home() {
  const [status, setStatus] = useState('Loading...');
  const [users, setUsers] = useState<User[]>([]);

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