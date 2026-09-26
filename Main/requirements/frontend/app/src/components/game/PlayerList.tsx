// @ts-nocheck
import { motion } from 'framer-motion';
import { CharacterPortrait } from '../CharacterPortrait';
import { TurnBadge } from './TurnBadge';

type PlayerItemProps = {
  character: string;
  isCurrentTurn: boolean;
  isMe: boolean;
};

function PlayerItem({ character, isCurrentTurn, isMe }: PlayerItemProps) {
  return (
    <motion.li
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm border ${
        isCurrentTurn 
          ? 'bg-green-500/10 border-green-500 text-green-400 font-bold' 
          : 'bg-stone-800 border-stone-700'
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <CharacterPortrait character={character} isMe={isMe} isCurrentTurn={isCurrentTurn} size="sm" />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{character}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isCurrentTurn && <TurnBadge />}
      </div>
    </motion.li>
  );
}

type PlayerListProps = {
  turnOrder: string[];
  currentTurnCharacter: string | null;
  myCharacter: string | null;
};

export function PlayerList({ turnOrder, currentTurnCharacter, myCharacter }: PlayerListProps) {
  if (turnOrder.length === 0) return null;

  return (
    <motion.aside
      className="w-[220px] flex-shrink-0 bg-stone-800 border border-stone-700 rounded-xl p-4"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xs uppercase tracking-wider text-stone-500 mb-3">Joueurs</h2>
      <ul className="list-none m-0 p-0 flex flex-col gap-2">
        {turnOrder.map((character) => (
          <PlayerItem
            key={character}
            character={character}
            isCurrentTurn={character === currentTurnCharacter}
            isMe={character === myCharacter}
          />
        ))}
      </ul>
    </motion.aside>
  );
}
