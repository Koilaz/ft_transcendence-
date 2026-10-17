// ============================================
// UTILS : Fonts par personnage
// ============================================

/**
 * Map des polices Tailwind par nom EXACT de personnage (format: "Grade Nom")
 */
export const CHARACTER_FONTS: Record<string, string> = {
  'Major Wasabi': 'font-wasabi',
  'General Ketchup': 'font-ketchup',
  'Colonel Moutarde': 'font-moutarde',
  'Maréchal Cocktail': 'font-cocktail',
  'Lieutenant Mayo': 'font-mayo',
  'Caporal Poivre': 'font-poivre',
};

/**
 * Récupère la classe Tailwind pour la police d'un personnage.
 * @param characterName - Nom du personnage
 * @returns Classe Tailwind (ex: 'font-wasabi')
 *         ou 'font-sans' si non trouvé (fallback)
 */
export function getCharacterFont(characterName: string): string {
  return CHARACTER_FONTS[characterName] || 'font-sans';
}
