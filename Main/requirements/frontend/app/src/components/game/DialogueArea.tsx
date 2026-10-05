// @ts-nocheck
import { motion } from 'framer-motion';
import type { FeedMessage } from '../../types/game';
import { getHeadImagePath, getCharacterFluoColor } from '../../utils/characters';

type DialogueBubbleProps = {
  sender: string;
  text: string;
  isSystem?: boolean;
  align: 'left' | 'right';
  index: number;
};

function DialogueBubble({ sender, text, isSystem, align, index }: DialogueBubbleProps) {
  if (isSystem) {
    return (
      <motion.div
        className="flex justify-center my-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <div className="text-base text-stone-400 italic bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 max-w-[85%]">
          {text}
        </div>
      </motion.div>
    );
  }

  const isLeft = align === 'left';
  const fluoColor = getCharacterFluoColor(sender);
  
  return (
    <motion.div
      className={`flex items-start gap-3 my-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'} p-2 rounded-2xl ${fluoColor}`}
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      {/* Portrait - carré 30% de largeur */}
      <motion.div
        className="flex-shrink-0 aspect-square"
        style={{ width: 'clamp(80px, 25%, 200px)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <img
          src={getHeadImagePath(sender)}
          alt={sender}
          className="w-full h-full object-cover border-2 border-amber-500/30 rounded-lg"
        />
      </motion.div>
      
      {/* Bulle - avec couleur fluo du personnage mais plus terne */}
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 relative ${fluoColor}/50 ${
          isLeft 
            ? 'rounded-bl-sm' 
            : 'rounded-br-sm'
        }`}
      >
        {/* Pointe de la bulle - couleur adaptée à fluoColor mais plus terne */}
        <div
          className={`absolute top-6 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] ${
            isLeft ? 'left-[-12px]' : 'right-[-12px]'
          } ${fluoColor.replace(/^bg-/, 'border-b-')}/50`}
        />
        
        {/* Contenu */}
        <div className="text-sm font-bold text-black mb-2">{sender}</div>
        <div className="text-base text-black leading-[1.5]">{text}</div>
      </div>
    </motion.div>
  );
}

type DialogueAreaProps = {
  messages: FeedMessage[];
  myCharacter: string | null;
};

export function DialogueArea({ messages, myCharacter }: DialogueAreaProps) {
  return (
    <motion.main
      className="h-full w-full overflow-hidden p-4 bg-stone-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="w-full h-full flex flex-col justify-end overflow-hidden">
        {messages
          .filter(message => message.kind === 'chat')  // ← Garder que les chats
          .map((message, index) => {
            // Alterner gauche/droite pour les messages chat
            const align = index % 2 === 0 ? 'left' : 'right';
            
            return (
              <DialogueBubble
                key={message.id}
                sender={message.sender}
                text={message.text}
                align={align}
                index={index}
              />
            );
          })}
      </div>
    </motion.main>
  );
}
