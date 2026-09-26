// @ts-nocheck
import { useState } from 'react';
import { MilitaryAvatar } from './MilitaryAvatar';

// Génère le path de l'image à partir du nom du personnage
// Ex: "General Ketchup" → "/generalketchup.png"
// Ex: "Major Wasabi" → "/majorwasabi.png"
function getImagePath(character: string): string {
  const cleanName = character
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return `/${cleanName}.png`;
}

type CharacterPortraitProps = {
  character: string;
  isMe?: boolean;
  isCurrentTurn?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function CharacterPortrait({
  character,
  isMe = false,
  isCurrentTurn = false,
  size = 'sm',
}: CharacterPortraitProps) {
  const [imageError, setImageError] = useState(false);
  const imagePath = getImagePath(character);

  // Si l'image n'a pas pu être chargée, on utilise MilitaryAvatar comme fallback
  if (imageError) {
    return (
      <MilitaryAvatar
        character={character}
        isMe={isMe}
        isCurrentTurn={isCurrentTurn}
        size={size}
      />
    );
  }

  // Classes de taille pour l'image
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <img
      src={imagePath}
      alt={`Portrait de ${character}`}
      className={`object-contain rounded-full ${sizeClasses[size]}`}
      onError={() => setImageError(true)}
    />
  );
}
