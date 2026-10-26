import { AnimatedPortrait } from './AnimatedPortrait';

// ============================================
// WRAPPERS PAR PERSONNAGE
// Délèguent à AnimatedPortrait avec le bon character
// ============================================

// Marechal Cocktail : normal → surpris → normal
export function AnimatedCocktailPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Marechal Cocktail" className={className} />;
}

// General Ketchup : normal → légèrement en colère → en colère
export function AnimatedKetchupPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="General Ketchup" className={className} />;
}

// Lieutenant Mayo : normal → yeux fermés → clin d'œil → sourire
export function AnimatedMayoPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Lieutenant Mayo" className={className} />;
}

// Colonel Moutarde : réflexion → normal → transpiration
export function AnimatedMoutardePortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Colonel Moutarde" className={className} />;
}

// Caporal Poivre : moustache qui bouge
export function AnimatedPoivrePortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Caporal Poivre" className={className} />;
}

// Major Wasabi : petites larmes → fontaine de pleurs → petites larmes
export function AnimatedWasabiPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Major Wasabi" className={className} />;
}
