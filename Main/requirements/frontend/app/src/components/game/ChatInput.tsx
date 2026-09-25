// @ts-nocheck
import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { InputState } from '../../types/game';

type ChatInputProps = {
  draft: string;
  setDraft: (value: string) => void;
  inputState: InputState;
  onSend: () => void;
};

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ draft, setDraft, inputState, onSend }, ref) => {
    return (
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <input
          ref={ref}
          className={`flex-1 bg-stone-800 border rounded-lg px-4 py-2 text-stone-200 transition-colors focus:outline-none ${
            inputState.myTurn ? 'border-green-500 ring-1 ring-green-500' : 'border-stone-700'
          }`}
          value={draft}
          disabled={!inputState.enabled}
          placeholder={inputState.placeholder}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
        />
        <motion.button
          type="button"
          className="bg-green-500 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!inputState.enabled || !draft.trim()}
          onClick={onSend}
          whileHover={{ scale: inputState.enabled ? 1.02 : 1 }}
          whileTap={{ scale: inputState.enabled ? 0.98 : 1 }}
        >
          Envoyer
        </motion.button>
      </motion.div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

