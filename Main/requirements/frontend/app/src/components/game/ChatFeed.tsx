// @ts-nocheck
import { motion } from 'framer-motion';
import type { FeedMessage } from '../../types/game';
import { ChatMessage } from './ChatMessage';
import { SystemMessage } from './SystemMessage';

type ChatFeedProps = {
  messages: FeedMessage[];
};

// Forward ref pour permettre l'accès au DOM element
import { forwardRef } from 'react';

export const ChatFeed = forwardRef<HTMLDivElement, ChatFeedProps>(({ messages }, ref) => {
  return (
    <motion.div
      ref={ref}
      className="border border-stone-700 bg-stone-800 rounded-xl flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2 text-black"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {messages
        .filter(message => message.kind === 'chat')  // ← Garder que les chats
        .map((message) => (
          <ChatMessage
            key={message.id}
            sender={message.sender}
            text={message.text}
          />
        ))}
    </motion.div>
  );
});

ChatFeed.displayName = 'ChatFeed';
