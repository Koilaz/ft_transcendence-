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
      className="border border-stone-700 bg-stone-800 rounded-xl h-[420px] overflow-y-auto p-3 mb-3 flex flex-col gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {messages.map((message) =>
        message.kind === 'chat' ? (
          <ChatMessage
            key={message.id}
            sender={message.sender}
            text={message.text}
          />
        ) : (
          <SystemMessage
            key={message.id}
            text={message.text}
          />
        )
      )}
    </motion.div>
  );
});

ChatFeed.displayName = 'ChatFeed';
