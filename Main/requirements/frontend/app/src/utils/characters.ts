// Configuration centrale des personnages, indexée par nom exact (tel que reçu du backend)
export const CHARACTERS = {
  'General Ketchup': {
    bodyImage: '/game/bodies/bodyGeneralKetchup.webp',
    color: 'bg-red-400',
    border: 'border-red-700',
    font: 'font-ketchup',
  },
  'Colonel Moutarde': {
    bodyImage: '/game/bodies/bodyColonelMoutarde.webp',
    color: 'bg-amber-300',
    border: 'border-amber-600',
    font: 'font-moutarde',
  },
  'Major Wasabi': {
    bodyImage: '/game/bodies/bodyMajorWasabi.webp',
    color: 'bg-emerald-400',
    border: 'border-emerald-700',
    font: 'font-wasabi',
  },
  'Marechal Cocktail': {
    bodyImage: '/game/bodies/bodyMarechalCocktail.webp',
    color: 'bg-blue-400',
    border: 'border-blue-700',
    font: 'font-cocktail',
  },
  'Lieutenant Mayo': {
    bodyImage: '/game/bodies/bodyLieutenantMayo.webp',
    color: 'bg-stone-300',
    border: 'border-stone-500',
    font: 'font-mayo',
  },
  'Caporal Poivre': {
    bodyImage: '/game/bodies/bodyCaporalPoivre.webp',
    color: 'bg-violet-400',
    border: 'border-violet-700',
    font: 'font-poivre',
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
  return getCharacterInfo(character)?.color ?? 'bg-stone-800/50';
}

export function getCharacterBorder(character: string): string {
  return getCharacterInfo(character)?.border ?? 'border-stone-600';
}

export function getCharacterFont(character: string): string {
  return getCharacterInfo(character)?.font ?? 'font-sans';
}
