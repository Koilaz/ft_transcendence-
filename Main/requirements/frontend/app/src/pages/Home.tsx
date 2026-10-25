import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';

import { MatrixRain } from '../components/MatrixRain';
import { setAccessToken } from '../services/session';
import { Button, ButtonLink, Modal } from '../components/ui';

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

  const isLoggedIn = !!localStorage.getItem('accessToken');

  return (
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
        {isLoggedIn ? (
          <>
            <ButtonLink to="/profile" variant="secondary" size="md">
              Profile
            </ButtonLink>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setAccessToken(null);
                navigate('/');
              }}
              className="text-red-400"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <ButtonLink to="/login" variant="secondary" size="md">
              Login
            </ButtonLink>
            <ButtonLink to="/register" variant="secondary" size="md">
              Register
            </ButtonLink>
          </>
        )}
      </motion.nav>

      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} className="max-w-md w-full">
        <button
          onClick={() => setShowMenu(false)}
          className="absolute top-2 right-4 text-stone-400 hover:text-white text-2xl transition bg-stone-800/50 rounded-full w-8 h-8 flex items-center justify-center"
          aria-label="Close menu"
        >
          ×
        </button>
        <div className="flex flex-col gap-3 w-full">
          {isLoggedIn ? (
            <ButtonLink to="/game" variant="outline" size="md" fullWidth onClick={() => setShowMenu(false)}>
              Quick Game
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="outline" size="md" fullWidth onClick={() => setShowMenu(false)}>
                Login
              </ButtonLink>
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setIsGuestFormOpen(true)}
              >
                Play as Guest
              </Button>
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
              <Button type="submit" variant="secondary" size="md" className="font-mono text-blue-400">
                Play
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </main>
  );
}
