// @ts-nocheck
import { motion } from 'framer-motion';
import type { ConnectionStatus } from '../../types/game';

type ConnBadgeProps = {
  label: string;
  status: ConnectionStatus;
};

export function ConnBadge({ label, status }: ConnBadgeProps) {
  const dotClass = {
    open: 'bg-green-400 shadow-[0_0_8px_#3ecf8e]',
    closed: 'bg-red-400 shadow-[0_0_8px_#ef5350]',
    connecting: 'bg-amber-400 shadow-[0_0_8px_#f5a623] animate-pulse',
  };

  return (
    <motion.div
      className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-800 border border-stone-700 px-3 py-1 rounded-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`w-2 h-2 rounded-full ${dotClass[status]}`} />
      <span>{label}</span>
    </motion.div>
  );
}
