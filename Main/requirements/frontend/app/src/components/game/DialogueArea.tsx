import type { ComponentType } from 'react';
import { useRef, useEffect } from 'react';
import { getCharacterColor, getCharacterBorder, getCharacterFont } from '../../utils/characters';
import {
  AnimatedMayoPortrait,
  AnimatedWasabiPortrait,
  AnimatedKetchupPortrait,
  AnimatedMoutardePortrait,
  AnimatedPoivrePortrait,
  AnimatedCocktailPortrait,
} from './animations';

const PORTRAIT_COMPONENTS: Record<string, ComponentType<{ className?: string }>> = {
  'Lieutenant Mayo': AnimatedMayoPortrait,
  'Major Wasabi': AnimatedWasabiPortrait,
  'General Ketchup': AnimatedKetchupPortrait,
  'Colonel Moutarde': AnimatedMoutardePortrait,
  'Caporal Poivre': AnimatedPoivrePortrait,
  'Marechal Cocktail': AnimatedCocktailPortrait,
};

type DialogueBubbleProps = {
  sender: string;
  text: string;
  align: 'left' | 'right';
  isFirst?: boolean;
};

function DialogueBubble({ sender, text, align, isFirst }: DialogueBubbleProps) {
  const isLeft = align === 'left';
  const color = getCharacterColor(sender);
  const borderColor = getCharacterBorder(sender);
  const Portrait = PORTRAIT_COMPONENTS[sender];

  return (
    <div
      className={`flex items-start gap-3 my-2 shrink-0 ${isFirst ? 'mt-auto' : ''} ${isLeft ? 'flex-row' : 'flex-row-reverse'} p-2 rounded-2xl border-2 ${color} ${borderColor} relative`}
    >
      <div
        className="flex-shrink-0 aspect-square rounded-lg overflow-hidden relative"
        style={{ width: 'clamp(48px, 16%, 120px)' }}
      >
        <div
          className="absolute inset-0 bg-[url('/game/heads/bg-head-sunburst-orange.webp')] bg-cover opacity-80"
        />
        {Portrait && (
          <Portrait className="relative w-full h-full object-cover rounded-lg border-2 border-white/50" />
        )}
      </div>

      <div
        className={`max-w-[75%] min-w-0 rounded-xl px-4 py-3 relative ${color}/50 ${
          isLeft ? 'rounded-bl-sm' : 'rounded-br-sm text-right'
        }`}
      >
        <div className={`text-base font-bold text-white mb-2 ${!isLeft ? 'text-right' : ''}`}>
          <span className="text-white font-bangers text-[clamp(1rem,2vw,1.375rem)]">
            {sender}
          </span>
        </div>

        <div className={`text-[clamp(0.875rem,1.2vw,1.375rem)] text-white text-left leading-[1.5] backdrop-blur-sm bg-abyss-950/50 rounded-lg px-4 py-1 inline-block max-w-full break-words ${getCharacterFont(sender)}`}>
          {text}
        </div>
      </div>
    </div>
  );
}

type ChatMessage = {
  id: string;
  kind: string;
  sender?: string;
  text: string;
};

type DialogueAreaProps = {
  messages: ChatMessage[];
  myCharacter: string | null;
};

export function DialogueArea({ messages, myCharacter }: DialogueAreaProps) {
  const chatMessages = messages.filter(
    (m): m is ChatMessage & { sender: string } => m.kind === 'chat' && !!m.sender
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain px-4 pt-4 pb-0">
      {chatMessages.map((message, index) => (
        <DialogueBubble
          key={message.id}
          sender={message.sender}
          text={message.text}
          align={message.sender === myCharacter ? 'right' : 'left'}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}
