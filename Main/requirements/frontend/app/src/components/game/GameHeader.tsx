// @ts-nocheck
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Tag } from './Tag';
import { CharacterBadge } from './CharacterBadge';
import { ConnBadge } from './ConnBadge';
import type { ConnectionStatus } from '../../types/game';

type GameHeaderProps = {
  roomNumber: number | null;
  roundIndicator: string;
  myCharacter: string | null;
  isGuest: boolean;
  guestName: string | null;
  connText: string;
  connStatus: ConnectionStatus;
};

export function GameHeader({
  roomNumber,
  roundIndicator,
  myCharacter,
  isGuest,
  guestName,
  connText,
  connStatus,
}: GameHeaderProps) {
  return (
    <motion.header
      className="flex items-center justify-between gap-3 flex-wrap mb-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold m-0">AImpostor</h1>
        <Tag>Salle #{roomNumber ?? '—'}</Tag>
        <Tag>{roundIndicator}</Tag>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {isGuest && guestName && <Tag>Invite : {guestName}</Tag>}
        {myCharacter && (
          <CharacterBadge>
            Tu incarnes : <strong className="text-stone-200">{myCharacter}</strong>
          </CharacterBadge>
        )}
        <Link to="/" className="no-underline">
          <Tag>← Accueil</Tag>
        </Link>
        <ConnBadge label={connText} status={connStatus} />
      </div>
    </motion.header>
  );
}
