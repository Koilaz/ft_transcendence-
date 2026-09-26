// @ts-nocheck
import { motion } from 'framer-motion';

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      className="text-xs text-stone-500 bg-stone-800 border border-stone-700 px-3 py-1 rounded-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.span>
  );
}
