import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent, Fragment } from 'react';

import { MatrixRain } from '../components/MatrixRain';
import { setAccessToken } from '../services/session';


export default function Home() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setShowMenu((prev) => !prev);
      }
      if (e.code === 'Escape') {
        setShowMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGuestSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (guestName.trim().length >= 2) {
      localStorage.setItem('guestName', guestName.trim());
      navigate('/game');
      setShowMenu(false);
      setIsGuestFormOpen(false);
      setGuestName('');
    }
  };

  return (
    <Fragment>
      <main className="min-h-screen bg-black text-stone-300 relative overflow-hidden">
        <MatrixRain />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-12">
          <h1
            className="text-5xl md:text-7xl font-['Bangers'] text-white tracking-wider"
            style={{ WebkitTextStroke: '2px #3b82f6' }}
          >
            AImpostor
          </h1>
          <p className="mt-2 text-stone-400 text-lg">
            Appuie sur <span className="text-blue-400 font-semibold">Espace</span> pour jouer
          </p>
        </div>

        {/* Barre de navigation fixe en haut à droite */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2"
        >
          {localStorage.getItem('accessToken') ? (
            /* Connecté : Profile + Logout */
            <>
              <Link
                to="/profile"
                className="rounded-lg bg-stone-900/90 text-white px-4 py-2 font-medium text-sm hover:bg-stone-800/50 transition border border-stone-700"
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  setAccessToken(null);
                  navigate('/');
                }}
                className="rounded-lg bg-stone-900/90 text-red-400 px-4 py-2 font-medium text-sm hover:bg-stone-800/50 transition border border-stone-700"
              >
                Logout
              </button>
            </>
          ) : (
            /* Déconnecté : Login */
            <>
              <Link
                to="/login"
                className="rounded-lg bg-stone-900/90 text-white px-4 py-2 font-medium text-sm hover:bg-stone-800/50 transition border border-stone-700"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-stone-900/90 text-white px-4 py-2 font-medium text-sm hover:bg-stone-800/50 transition border border-stone-700"
              >
                Register
              </Link>
            </>
          )}
        </motion.nav>

        <AnimatePresence>
          {showMenu && (
            <Fragment>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                onClick={() => setShowMenu(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.1 }}
                  className="relative bg-stone-900/90 border border-stone-700 rounded-xl p-8 shadow-2xl shadow-stone-900/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowMenu(false)}
                    className="absolute top-2 right-4 text-stone-400 hover:text-white text-2xl transition bg-stone-800/50 rounded-full w-8 h-8 flex items-center justify-center"
                    aria-label="Close menu"
                  >
                    ×
                  </button>
                  <div className="flex flex-col gap-3 w-full max-w-md">
                    {localStorage.getItem('accessToken') ? (
                      // Connecté : seulement Quick Game
                      <Link
                        to="/game"
                        className="w-full text-center rounded-lg bg-transparent text-white px-4 py-2 font-medium text-sm hover:bg-stone-800/50 transition border border-stone-600"
                        onClick={() => setShowMenu(false)}
                      >
                        Quick Game
                      </Link>
                    ) : (
                      // Non connecté : Login + Play as Guest
                      <>
                        <Link
                          to="/login"
                          className="w-full text-center rounded-lg bg-transparent text-white px-4 py-2 font-medium text-sm hover:bg-stone-800/50 transition border border-stone-600"
                          onClick={() => setShowMenu(false)}
                        >
                          Login
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isGuestFormOpen) {
                              setIsGuestFormOpen(true);
                            }
                          }}
                          className="w-full text-center rounded-lg bg-transparent text-white px-4 py-2 font-medium text-sm hover:bg-stone-800/50 transition border border-stone-600"
                        >
                          Play as Guest
                        </button>
                      </>
                    )}

                    {isGuestFormOpen && (
                      <form onSubmit={handleGuestSubmit} className="flex gap-2 w-full mt-2">
                        <input
                          type="text"
                          value={guestName}
                          onChange={(event) => setGuestName(event.target.value)}
                          placeholder="Your nickname"
                          minLength={2}
                          maxLength={20}
                          required
                          autoComplete="off"
                          className="flex-1 rounded-lg border border-stone-600 bg-stone-800/80 px-4 py-2 text-blue-400 font-mono text-sm outline-none transition focus:border-blue-400 placeholder:text-stone-500"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-stone-800/80 text-blue-400 px-4 py-2 font-mono text-sm hover:bg-stone-700/80 transition border border-stone-600"
                        >
                          Play
                        </button>
                      </form>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </Fragment>
          )}
        </AnimatePresence>
      </main>
    </Fragment>
  );
}
