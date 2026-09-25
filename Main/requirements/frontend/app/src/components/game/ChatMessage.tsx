// @ts-nocheck
import { motion } from 'framer-motion';
import { CharacterPortrait } from '../CharacterPortrait';

type ChatMessageProps = {
  sender: string;
  text: string;
};

export function ChatMessage({ sender, text }: ChatMessageProps) {
  return (
    <motion.div
      className="flex gap-2 items-start"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <CharacterPortrait character={sender} size="sm" />
      <div className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 max-w-[80%]">
        <div className="text-xs font-bold text-green-400 mb-0.5">{sender}</div>
        <div className="text-sm leading-[1.35] break-words">{text}</div>
      </div>
    </motion.div>
  );
}
