import { forwardRef } from 'react';
import { Send } from 'lucide-react';
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
          className={`flex-1 bg-abyss-900/50 border rounded-lg px-4 py-1 text-abyss-200 text-base transition-colors focus:outline-none ${
            inputState.myTurn ? 'border-azur-500 ring-2 ring-azur-500' : 'border-abyss-700'
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
          icon={Send}
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

