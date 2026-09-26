// @ts-nocheck
import { motion } from 'framer-motion';
import { TimerBunny } from '../TimerBunny';
import type { Banner } from '../../types/game';

type GameBannerProps = {
  banner: Banner;
  bannerStyle: string;
  timerVisible: boolean;
  countdown: number | null;
  timerLabel: string;
};

export function GameBanner({ banner, bannerStyle, timerVisible, countdown, timerLabel }: GameBannerProps) {
  return (
    <motion.div
      layout
      className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-4 border ${bannerStyle}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="text-lg font-semibold">{banner.text}</span>
      {timerVisible && countdown !== null && (
        <div className="flex flex-col items-center flex-shrink-0 gap-1">
          <TimerBunny countdown={countdown} size={48} />
          <div className="text-[0.65rem] uppercase tracking-wider opacity-70">{timerLabel}</div>
        </div>
      )}
    </motion.div>
  );
}
