import { motion } from 'framer-motion';
import { TimerBunny } from '../TimerBunny';

type GameHeaderProps = {
  roomNumber: number | null;
  roundIndicator: string;
  turnCycle: number | null;
  countdown: number | null;
  timerVisible: boolean;
  onQuit: () => void;
};

export function GameHeader({
  roomNumber,
  roundIndicator,
  turnCycle,
  countdown,
  timerVisible,
  onQuit,
}: GameHeaderProps) {
  // Extraction du numéro de manche et de tour
  const getMancheNumber = (indicator: string) => {
    const match = indicator.match(/Manche (\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  const currentManche = getMancheNumber(roundIndicator);
  const currentTour = 4 - (turnCycle ?? 3);

  return (
    <motion.header
      className="h-full w-full flex-shrink-0 flex items-center border-b border-stone-700 relative bg-cyan-900/60"
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
      }}
    >
          {/* Salle - 10% */}
          <div className="w-[10%] h-full flex items-center justify-center px-2">
            <div className="bg-cyan-800/80 border border-cyan-600 rounded-xl px-3 py-1 flex flex-col items-center gap-1">
              <span className="text-lg md:text-xl lg:text-2xl font-bold text-white truncate font-bangers">
                Salle
              </span>
              <span className="text-lg md:text-xl lg:text-2xl font-bold text-white truncate font-bangers">
                #{roomNumber ?? '—'}
              </span>
            </div>
          </div>

          {/* Manche - 15% */}
          <div className="w-[15%] h-full flex items-center justify-center">
            <motion.div
              key={currentManche}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-cyan-800/80 border border-cyan-600 rounded-xl px-3 py-2 flex flex-col items-center gap-1"
            >
              <span className="text-white text-sm font-semibold font-bangers">Manche</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="text-2xl text-white font-bangers"
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
                className="text-[clamp(3rem,14vw,10rem)] font-bold text-white font-bangers"
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
              className="bg-cyan-800/80 border border-cyan-600 rounded-xl px-3 py-2 flex flex-col items-center gap-1"
            >
              <span className="text-white text-sm font-semibold font-bangers">Tour</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="text-xl text-white font-bangers"
                  >
                    {i <= currentTour ? '●' : '○'}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quitter - 10% */}
          <div className="w-[10%] h-full flex items-center justify-end pr-2">
            <button
              type="button"
              onClick={onQuit}
              className="bg-cyan-800/80 border border-cyan-600 rounded-lg p-2 text-xl font-semibold text-red-400 transition-colors hover:bg-cyan-700/80"
            >
              ❌
            </button>
          </div>
    </motion.header>
  );
}
