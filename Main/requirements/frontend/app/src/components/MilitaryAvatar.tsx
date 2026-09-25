// @ts-nocheck
import { motion } from 'framer-motion';

type MilitaryAvatarProps = {
  character: string;
  isMe?: boolean;
  isCurrentTurn?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
};

function colorFor(sender: string): string {
  let hash = 0;
  for (let i = 0; i < sender.length; i++) {
    hash = sender.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3ecf8e',
    '#6c8bff',
    '#f5a623',
    '#ef5350',
    '#a569bd',
    '#2ed573',
    '#1e90ff',
    '#ff6b6b',
    '#ff9f43',
    '#54a0ff',
  ];
  return colors[hash % colors.length];
}

function initialsFor(sender: string): string {
  const parts = sender.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return sender.slice(0, 2).toUpperCase();
}

function getRankIcon(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('general') || lowerName.includes('gen ')) return 'general';
  if (lowerName.includes('colonel') || lowerName.includes('col ')) return 'colonel';
  if (lowerName.includes('major')) return 'major';
  if (lowerName.includes('captain') || lowerName.includes('capt')) return 'captain';
  if (lowerName.includes('lieutenant') || lowerName.includes('lt ')) return 'lieutenant';
  if (lowerName.includes('sergeant') || lowerName.includes('sgt')) return 'sergeant';
  if (lowerName.includes('corporal') || lowerName.includes('cpl')) return 'corporal';
  if (lowerName.includes('private') || lowerName.includes('pvt')) return 'private';
  if (lowerName.includes('admiral')) return 'admiral';
  if (lowerName.includes('commander') || lowerName.includes('cmdr')) return 'commander';
  if (lowerName.includes('ketchup')) return 'general';
  if (lowerName.includes('wasabi')) return 'major';
  if (lowerName.includes('cocktail')) return 'colonel';
  if (lowerName.includes('mustard')) return 'captain';
  if (lowerName.includes('mayo')) return 'lieutenant';
  if (lowerName.includes('pepper')) return 'sergeant';
  if (lowerName.includes('sauce')) return 'corporal';
  if (lowerName.includes('relish')) return 'private';
  return 'default';
}

function RankIcon({ rank, color }: { rank: string; color: string }) {
  const strokeWidth = 1.5;
  const baseProps = { stroke: color, strokeWidth, fill: 'none' };

  switch (rank) {
    case 'general':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <line x1="10" y1="16" x2="9" y2="18" {...baseProps} />
          <line x1="9" y1="18" x2="10" y2="16" {...baseProps} />
          <line x1="14" y1="16" x2="15" y2="18" {...baseProps} />
          <line x1="15" y1="18" x2="14" y2="16" {...baseProps} />
          <line x1="10" y1="20" x2="9" y2="22" {...baseProps} />
          <line x1="14" y1="20" x2="15" y2="22" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'colonel':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <path d="M10 16 L10 18 L12 17 L14 18 L14 16" {...baseProps} />
          <path d="M11 19 L11 20 L13 20 L13 19" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'major':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <path d="M12 16 L10 18 L11 20 L12 19 L13 20 L14 18 L12 16" {...baseProps} />
          <path d="M12 18 L12 22" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'captain':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <line x1="10" y1="16" x2="14" y2="16" {...baseProps} />
          <line x1="10" y1="18" x2="14" y2="18" {...baseProps} />
          <line x1="10" y1="20" x2="14" y2="20" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'lieutenant':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <line x1="10" y1="16" x2="14" y2="16" {...baseProps} />
          <line x1="10" y1="18" x2="14" y2="18" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'sergeant':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <path d="M10 16 L12 18 L14 16" {...baseProps} />
          <path d="M10 18 L12 20 L14 18" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'corporal':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <path d="M10 16 L12 18 L14 16" {...baseProps} />
          <path d="M10 18 L12 20 L14 18" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'private':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <path d="M10 16 L12 18 L14 16" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'admiral':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <line x1="12" y1="4" x2="12" y2="2" {...baseProps} />
          <circle cx="12" cy="2" r="0.8" fill={color} />
          <line x1="10" y1="16" x2="11" y2="18" {...baseProps} />
          <line x1="13" y1="16" x2="14" y2="18" {...baseProps} />
          <line x1="10" y1="20" x2="11" y2="22" {...baseProps} />
          <line x1="13" y1="20" x2="14" y2="22" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    case 'commander':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <line x1="10" y1="16" x2="11" y2="18" {...baseProps} />
          <line x1="13" y1="16" x2="14" y2="18" {...baseProps} />
          <line x1="11" y1="20" x2="12" y2="21" {...baseProps} />
          <line x1="12" y1="21" x2="13" y2="20" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M6 4 L18 4 L18 8 Q18 10 16 10 L8 10 Q6 10 6 8 Z" {...baseProps} />
          <path d="M8 10 L8 14 L16 14 L16 10" {...baseProps} />
          <circle cx="12" cy="17" r="2" {...baseProps} />
          <rect x="8" y="6" width="8" height="2" rx="0.5" fill={color} opacity={0.2} />
        </svg>
      );
  }
}

export function MilitaryAvatar({
  character,
  isMe = false,
  isCurrentTurn = false,
  size = 'sm',
}: MilitaryAvatarProps) {
  const bgColor = colorFor(character);
  const rank = getRankIcon(character);

  return (
    <motion.div
      className={`relative flex items-center justify-center rounded-full ${sizeClasses[size]}`}
      style={{ background: `${bgColor}20` }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {isMe && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-stone-900 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-[0.5rem] font-bold text-stone-900">TOI</span>
        </motion.div>
      )}

      {isCurrentTurn && !isMe && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-stone-900"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      <div className={iconSizeClasses[size]}>
        <RankIcon rank={rank} color={bgColor} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-opacity-60 pointer-events-none text-[0.6rem]">
        {initialsFor(character)}
      </div>
    </motion.div>
  );
}
