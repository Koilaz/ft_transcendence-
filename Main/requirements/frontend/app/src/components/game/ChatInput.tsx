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
      <div className="flex gap-3 backdrop-blur-sm rounded-xl px-3 pb-3 h-full">
        <input
          ref={ref}
          className={`flex-1 bg-stone-900/50 border rounded-lg px-5 py-2 text-stone-200 text-lg transition-colors focus:outline-none ${
            inputState.myTurn ? 'border-green-500 ring-2 ring-green-500' : 'border-stone-700'
          }`}
          value={draft}
          disabled={!inputState.enabled}
          placeholder={inputState.placeholder}
          autoComplete="off"
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
        />
        <motion.button
          type="button"
          className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!inputState.enabled || !draft.trim()}
          onClick={onSend}
          whileHover={{ scale: inputState.enabled ? 1.02 : 1 }}
          whileTap={{ scale: inputState.enabled ? 0.98 : 1 }}
        >
          Envoyer
        </motion.button>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

