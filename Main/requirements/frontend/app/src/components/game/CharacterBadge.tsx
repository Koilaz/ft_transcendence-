// @ts-nocheck
import { motion } from 'framer-motion';

export function CharacterBadge({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      className="text-sm bg-green-500/10 text-green-400 font-semibold px-3 py-1 rounded-full"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.span>
  );
}
