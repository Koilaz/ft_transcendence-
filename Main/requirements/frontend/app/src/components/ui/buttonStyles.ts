// Apparence partagee par Button et ButtonLink : mêmes variantes, mêmes
// tailles, une seule paire de tables. Corriger une variante se fait ici,
// une fois — les deux composants suivent (la duplication d'avant etait
// verbatim et se desynchronisait a la premiere correction oubliee).

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-azur-500 text-abyss-900 hover:bg-azur-400',
  secondary: 'bg-abyss-800 text-white hover:bg-abyss-700',
  outline: 'border border-abyss-600 bg-transparent text-white hover:bg-abyss-800/50',
  // Action celebratoire de fin de partie (Rejouer) : le success garde un texte
  // sombre, comme le primaire, pour le contraste sur le fond clair.
  success: 'bg-success-500 text-abyss-950 hover:bg-success-400',
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'px-[clamp(0.5rem,2vw,0.75rem)] py-[clamp(0.25rem,1vw,0.375rem)] text-sm',
  md: 'px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.375rem,1vw,0.5rem)] text-sm',
  lg: 'px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.5rem,1.5vw,0.75rem)] text-base font-semibold',
};
