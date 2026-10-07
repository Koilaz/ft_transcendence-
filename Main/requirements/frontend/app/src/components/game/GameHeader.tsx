// @ts-nocheck
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TimerBunny } from '../TimerBunny';
import { getCharacterFluoColor } from '../../utils/characters';

type GameHeaderProps = {
  roomNumber: number | null;
  roundIndicator: string;
  turnCycle: number | null;
  countdown: number | null;
  timerLabel: string;
  timerVisible: boolean;
  characters?: string[];
  onQuit?: () => void;
};

export function GameHeader({
  roomNumber,
  roundIndicator,
  turnCycle,
  countdown,
  timerLabel,
  timerVisible,
  characters = [],
  onQuit,
}: GameHeaderProps) {
  // Extraction du numéro de manche et de tour
  const getMancheNumber = (indicator: string) => {
    const match = indicator.match(/Manche (\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  const currentManche = getMancheNumber(roundIndicator);
  const currentTour = 4 - (turnCycle ?? 3);

  // Mapping des classes Tailwind vers couleurs HEX
  const colorMap: Record<string, string> = {
    'bg-red-500': '#ef4444',
    'bg-yellow-400': '#fbbf24',
    'bg-lime-400': '#a3e635',
    'bg-cyan-400': '#22d3ee',
    'bg-white': '#ffffff',
    'bg-fuchsia-500': '#ec4899',
  };

  // Génère le background avec les couleurs des personnages actuels
  const getStripedBackground = () => {
    if (characters.length === 0) return {};
    
    const colors = characters.map(c => {
      const fluoClass = getCharacterFluoColor(c);
      return colorMap[fluoClass] || '#6b7280';
    });

    return {
      background: `linear-gradient(-45deg, ${colors.join(', ')})`,
      backgroundSize: '400% 400%',
      animation: 'gradient 15s ease infinite',
    };
  };

  const headerStyle = getStripedBackground();

  return (
    <motion.header
      className="h-full w-full flex-shrink-0 flex items-center border-b border-stone-700 relative"
      style={headerStyle}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animation du gradient */}
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
          {/* Salle - 10% */}
          <div className="w-[10%] h-full flex items-center justify-start px-2">
            <span className="bg-stone-800 border border-stone-600 rounded-xl px-3 py-1 text-2xl font-bold text-amber-400 truncate">
              Salle #{roomNumber ?? '—'}
            </span>
          </div>

          {/* Manche - 15% */}
          <div className="w-[15%] h-full flex items-center justify-center">
            <motion.div
              key={currentManche}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-black text-sm font-semibold">Manche</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="text-2xl text-black"
                  >
                    {i <= currentManche ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bunny gauche - 15% */}
          <div className="w-[15%] h-full flex items-center justify-end pr-1">
            {timerVisible && countdown !== null && (
              <div className="h-full w-full">
                <TimerBunny countdown={countdown} />
              </div>
            )}
          </div>

          {/* Timer - 20% */}
          <div className="w-[20%] h-full flex items-center justify-center">
            {timerVisible && countdown !== null && (
              <motion.span
                className="text-[clamp(3rem,14vw,10rem)] font-bold text-black"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {countdown}
              </motion.span>
            )}
          </div>

          {/* Bunny droit - 15% */}
          <div className="w-[15%] h-full flex items-center justify-start pl-1">
            {timerVisible && countdown !== null && (
              <div className="h-full w-full scale-x-[-1]">
                <TimerBunny countdown={countdown} />
              </div>
            )}
          </div>

          {/* Tour - 15% */}
          <div className="w-[15%] h-full flex items-center justify-center">
            <motion.div
              key={currentTour}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-black text-sm font-semibold">Tour</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="text-xl text-black"
                  >
                    {i <= currentTour ? '●' : '○'}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quitter - 10% */}
          <div className="w-[10%] h-full flex items-center justify-end pr-2">
            <Link
              to="/"
              className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-2 text-lg font-semibold text-red-400 transition-colors truncate"
            >
              ❌ Quitter
            </Link>
          </div>
    </motion.header>
  );
}
