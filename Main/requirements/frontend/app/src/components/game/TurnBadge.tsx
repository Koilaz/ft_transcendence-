// @ts-nocheck
import { motion } from 'framer-motion';

export function TurnBadge() {
  return (
    <motion.span
      className="text-xs font-bold text-green-400 whitespace-nowrap"
      animate={{ opacity: [1, 0.45, 1] }}
      transition={{ duration: 1.4, repeat: Infinity }}
    >
      ● en train de jouer
    </motion.span>
  );
}
