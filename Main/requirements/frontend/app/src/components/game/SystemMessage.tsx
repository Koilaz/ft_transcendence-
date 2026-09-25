// @ts-nocheck
import { motion } from 'framer-motion';

type SystemMessageProps = {
  text: string;
};

export function SystemMessage({ text }: SystemMessageProps) {
  return (
    <motion.div
      className="justify-center flex"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-sm text-stone-500 italic">{text}</div>
    </motion.div>
  );
}
