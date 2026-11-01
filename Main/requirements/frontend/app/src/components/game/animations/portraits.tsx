import { AnimatedPortrait } from './AnimatedPortrait';

export function AnimatedCocktailPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Marechal Cocktail" className={className} />;
}

export function AnimatedKetchupPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="General Ketchup" className={className} />;
}

export function AnimatedMayoPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Lieutenant Mayo" className={className} />;
}

export function AnimatedMoutardePortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Colonel Moutarde" className={className} />;
}

export function AnimatedPoivrePortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Caporal Poivre" className={className} />;
}

export function AnimatedWasabiPortrait({ className }: { className?: string }) {
  return <AnimatedPortrait character="Major Wasabi" className={className} />;
}
