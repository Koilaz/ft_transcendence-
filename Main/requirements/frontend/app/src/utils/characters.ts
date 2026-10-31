// ============================================
// TYPES ANIMATION
// ============================================
export type AnimationStep = { delay: number; index: number };
export type CharacterAnimation = {
  images: string[];
  sequence: AnimationStep[];
  loopDuration: number;
  alt: string;
};

// ============================================
// CONFIGURATION CENTRALE DES PERSONNAGES
// ============================================
export const CHARACTERS = {
  'General Ketchup': {
    bodyImage: '/game/bodies/bodyGeneralKetchup.webp',
    color: 'bg-ketchup-400',
    border: 'border-ketchup-700',
    font: 'font-ketchup',
    animation: {
      images: [
        '/game/heads/generalketchup/headGeneralKetchup.webp',
        '/game/heads/generalketchup/headGeneralKetchupSlightAngry.webp',
        '/game/heads/generalketchup/headGeneralKetchupAngry.webp',
      ],
      sequence: [
        { delay: 0, index: 0 },
        { delay: 2000, index: 1 },
        { delay: 3000, index: 2 },
        { delay: 4500, index: 1 },
        { delay: 5000, index: 0 },
      ],
      loopDuration: 6000,
      alt: 'General Ketchup',
    } as CharacterAnimation,
  },
  'Colonel Moutarde': {
    bodyImage: '/game/bodies/bodyColonelMoutarde.webp',
    color: 'bg-moutarde-300',
    border: 'border-moutarde-600',
    font: 'font-moutarde',
    animation: {
      images: [
        '/game/heads/colonelmoutarde/headColonelMoutardeThinking.webp',
        '/game/heads/colonelmoutarde/headColonelMoutarde.webp',
        '/game/heads/colonelmoutarde/headColonelMoutardeSweating.webp',
      ],
      sequence: [
        { delay: 0, index: 0 },
        { delay: 3000, index: 1 },
        { delay: 3500, index: 2 },
        { delay: 5500, index: 1 },
        { delay: 6000, index: 0 },
      ],
      loopDuration: 6000,
      alt: 'Colonel Moutarde',
    } as CharacterAnimation,
  },
  'Major Wasabi': {
    bodyImage: '/game/bodies/bodyMajorWasabi.webp',
    color: 'bg-wasabi-400',
    border: 'border-wasabi-700',
    font: 'font-wasabi',
    animation: {
      images: [
        '/game/heads/majorwasabi/headMajorWasabiTears.webp',
        '/game/heads/majorwasabi/headMajorWasabiCrying.webp',
        '/game/heads/majorwasabi/headMajorWasabiCryingEnd.webp',
        '/game/heads/majorwasabi/headMajorWasabi.webp',
      ],
      sequence: [
        { delay: 0, index: 0 },
        { delay: 3000, index: 1 },
        { delay: 5000, index: 2 },
        { delay: 5100, index: 3 },
        { delay: 5200, index: 0 },
      ],
      loopDuration: 5200,
      alt: 'Major Wasabi',
    } as CharacterAnimation,
  },
  'Marechal Cocktail': {
    bodyImage: '/game/bodies/bodyMarechalCocktail.webp',
    color: 'bg-cocktail-400',
    border: 'border-cocktail-700',
    font: 'font-cocktail',
    animation: {
      images: [
        '/game/heads/marechalcocktail/headMarechalCocktail.webp',
        '/game/heads/marechalcocktail/headMarechalCocktailSurprised.webp',
      ],
      sequence: [
        { delay: 0, index: 0 },
        { delay: 3000, index: 1 },
        { delay: 4500, index: 0 },
      ],
      loopDuration: 6000,
      alt: 'Marechal Cocktail',
    } as CharacterAnimation,
  },
  'Lieutenant Mayo': {
    bodyImage: '/game/bodies/bodyLieutenantMayo.webp',
    color: 'bg-abyss-300',
    border: 'border-abyss-500',
    font: 'font-mayo',
    animation: {
      images: [
        '/game/heads/lieutenantmayo/headLieutenantMayo.webp',
        '/game/heads/lieutenantmayo/headLieutenantMayoClosedEyes.webp',
        '/game/heads/lieutenantmayo/headLieutenantMayo.webp',
        '/game/heads/lieutenantmayo/headLieutenantMayoWink.webp',
        '/game/heads/lieutenantmayo/headLieutenantMayo.webp',
        '/game/heads/lieutenantmayo/headLieutenantMayoSmile.webp',
      ],
      sequence: [
        { delay: 0, index: 0 },
        { delay: 2000, index: 1 },
        { delay: 2200, index: 2 },
        { delay: 3200, index: 3 },
        { delay: 3700, index: 4 },
        { delay: 4700, index: 5 },
      ],
      loopDuration: 7200,
      alt: 'Lieutenant Mayo',
    } as CharacterAnimation,
  },
  'Caporal Poivre': {
    bodyImage: '/game/bodies/bodyCaporalPoivre.webp',
    color: 'bg-poivre-400',
    border: 'border-poivre-700',
    font: 'font-poivre',
    animation: {
      images: [
        '/game/heads/caporalpoivre/headCaporalPoivre.webp',
        '/game/heads/caporalpoivre/headCaporalPoivreMustacheStraight.webp',
        '/game/heads/caporalpoivre/headCaporalPoivreMustacheUp.webp',
        '/game/heads/caporalpoivre/headCaporalPoivreMustacheDown.webp',
      ],
      sequence: [
        { delay: 0, index: 0 },
        { delay: 2000, index: 1 },
        { delay: 2200, index: 2 },
        { delay: 2350, index: 3 },
        { delay: 2500, index: 1 },
        { delay: 2700, index: 0 },
      ],
      loopDuration: 4000,
      alt: 'Caporal Poivre',
    } as CharacterAnimation,
  },
} as const;

type CharacterName = keyof typeof CHARACTERS;

function getCharacterInfo(character: string) {
  return CHARACTERS[character as CharacterName] ?? null;
}

export function getBodyImagePath(character: string): string {
  return getCharacterInfo(character)?.bodyImage ?? '';
}

export function getCharacterColor(character: string): string {
  return getCharacterInfo(character)?.color ?? 'bg-abyss-800/50';
}

export function getCharacterBorder(character: string): string {
  return getCharacterInfo(character)?.border ?? 'border-abyss-600';
}

export function getCharacterFont(character: string): string {
  return getCharacterInfo(character)?.font ?? 'font-sans';
}

export function getCharacterAnimation(character: string): CharacterAnimation | null {
  return getCharacterInfo(character)?.animation ?? null;
}
