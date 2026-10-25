import { forwardRef } from 'react';
import type { InputState } from '../../types/game';
import { Button } from '../ui';

type ChatInputProps = {
  draft: string;
  setDraft: (value: string) => void;
  inputState: InputState;
  onSend: () => void;
};

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ draft, setDraft, inputState, onSend }, ref) => {
    return (
      <div className="flex gap-3 backdrop-blur-sm rounded-xl px-3 h-full">
        <input
          ref={ref}
          className={`flex-1 bg-stone-900/50 border rounded-lg px-4 py-1 text-stone-200 text-base transition-colors focus:outline-none ${
            inputState.myTurn ? 'border-blue-500 ring-2 ring-blue-500' : 'border-stone-700'
          }`}
          value={draft}
          disabled={!inputState.enabled}
          placeholder={inputState.placeholder}
          autoComplete="off"
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
        />
        <Button
          variant="primary"
          size="md"
          disabled={!inputState.enabled || !draft.trim()}
          onClick={onSend}
          className="px-4 py-1 text-base"
        >
          Envoyer
        </Button>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

