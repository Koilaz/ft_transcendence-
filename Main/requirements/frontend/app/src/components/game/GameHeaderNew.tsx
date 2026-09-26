// @ts-nocheck
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TimerBunny } from '../TimerBunny';

type GameHeaderNewProps = {
  roomNumber: number | null;
  roundIndicator: string;
  countdown: number | null;
  timerLabel: string;
  timerVisible: boolean;
  onQuit?: () => void;
};

export function GameHeaderNew({
  roomNumber,
  roundIndicator,
  countdown,
  timerLabel,
  timerVisible,
  onQuit,
}: GameHeaderNewProps) {
  return (
    <motion.header
      className="h-[80px] flex-shrink-0 flex items-center justify-between px-6 py-4 bg-stone-900 border-b border-stone-700"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Infos partie */}
      <div className="flex items-center gap-6">
        <div className="text-2xl font-bold text-stone-200">
          Salle #{roomNumber ?? '—'}
        </div>
        <div className="text-xl text-stone-400">
          {roundIndicator}
        </div>
      </div>

      {/* Timer central - lapin avec compteur à côté (tailles relatives) */}
      <div className="flex items-center gap-2 w-[50%] justify-center">
        {timerVisible && countdown !== null && (
          <div className="flex items-center gap-2 w-full justify-center">
            <div className="w-[6vw] h-[6vw] max-w-[60px] max-h-[60px] min-w-[40px] min-h-[40px]">
              <TimerBunny countdown={countdown} />
            </div>
            <motion.span
              className="text-[6vw] md:text-[4vw] font-bold text-amber-400 min-text-[28px]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {countdown}
            </motion.span>
          </div>
        )}
      </div>

      {/* Bouton Quitter */}
      <Link
        to="/"
        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-6 py-3 text-lg font-semibold transition-colors"
      >
        ❌ Quitter
      </Link>
    </motion.header>
  );
}
