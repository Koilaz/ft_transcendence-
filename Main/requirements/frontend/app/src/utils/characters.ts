// @ts-nocheck
// Configuration centrale des personnages

// Mapping des noms de personnages (tels que reçus du backend) vers leurs propriétés
// Les clés sont les noms normalisés (sans espaces, minuscules)
export const CHARACTERS = {
  // Format: cleanName -> { originalNames, headImage, bodyImage, color, fluoColor }
  generalketchup: {
    originalNames: ['General Ketchup', 'Generale Ketchup', 'GeneralKetchup'],
    headImage: '/headGeneralKetchup.png',
    bodyImage: '/bodyGeneralKetchup.png',
    color: 'bg-red-500/30 border-2 border-red-500',
    fluoColor: 'bg-red-500',
    colorClass: 'ring-red-500',
  },
  colonelmoutarde: {
    originalNames: ['Colonel Moutarde', 'ColonelMoutarde'],
    headImage: '/headColonelMoutarde.png',
    bodyImage: '/bodyColonelMoutarde.png',
    color: 'bg-amber-500/30 border-2 border-amber-500',
    fluoColor: 'bg-yellow-400',
    colorClass: 'ring-amber-500',
  },
  majorwasabi: {
    originalNames: ['Major Wasabi', 'MajorWasabi'],
    headImage: '/headMajorWasabi.png',
    bodyImage: '/bodyMajorWasabi.png',
    color: 'bg-green-500/30 border-2 border-green-500',
    fluoColor: 'bg-lime-400',
    colorClass: 'ring-green-500',
  },
  marechalcocktail: {
    originalNames: ['Marechal Cocktail', 'Maréchal Cocktail', 'MarechalCocktail'],
    headImage: '/headMarechalCocktail.png',
    bodyImage: '/bodyMarechalCocktail.png',
    color: 'bg-blue-500/30 border-2 border-blue-500',
    fluoColor: 'bg-cyan-400',
    colorClass: 'ring-blue-500',
  },
  lieutenantmajo: {
    originalNames: ['Lieutenant Mayo', 'Lieutenant Majo', 'LieutenantMayo', 'LieutenantMajo'],
    headImage: '/headLieutenantMajo.png',
    bodyImage: '/bodyLieutenantMajo.png',
    color: 'bg-white/20 border-2 border-white/50',
    fluoColor: 'bg-white',
    colorClass: 'ring-white',
  },
  caporalpoivre: {
    originalNames: ['Caporal Poivre', 'CaporalPoivre', 'Sergent Poivre', 'SergentPoivre'],
    headImage: '/headCaporalPoivre.png',
    bodyImage: '/bodyCaporalPoivre.png',
    color: 'bg-purple-500/30 border-2 border-purple-500',
    fluoColor: 'bg-fuchsia-500',
    colorClass: 'ring-purple-500',
  },
};

// Fonction utilitaire pour obtenir les infos d'un personnage
export function getCharacterInfo(character: string) {
  const cleanName = character.replace(/\s+/g, '').toLowerCase();
  return CHARACTERS[cleanName as keyof typeof CHARACTERS] || null;
}

// Fonction pour obtenir l'image de tête
export function getHeadImagePath(character: string): string {
  const info = getCharacterInfo(character);
  return info?.headImage || '/headColonelMoutarde.png';
}

// Fonction pour obtenir l'image body
export function getBodyImagePath(character: string): string {
  const info = getCharacterInfo(character);
  return info?.bodyImage || '/bodyColonelMoutarde.png';
}

// Fonction pour obtenir la couleur de background
export function getCharacterBgColor(character: string): string {
  const info = getCharacterInfo(character);
  return info?.color || 'bg-stone-800/50 border-2 border-stone-700';
}

// Fonction pour obtenir la couleur fluo (pour les backgrounds de discussion)
export function getCharacterFluoColor(character: string): string {
  const info = getCharacterInfo(character);
  return info?.fluoColor || 'bg-stone-800/50';
}
