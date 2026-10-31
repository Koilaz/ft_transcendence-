import type { LucideIcon } from 'lucide-react';

type IconSize = 'sm' | 'md' | 'lg';

type IconProps = {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
};

const sizeClasses: Record<IconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

// Enveloppe des icones lucide-react du design system : taille unifiee par
// echelle typographique, et masquee aux lecteurs d'ecran — l'icone est
// decorative, le libelle du bouton ou du lien porte le sens.
export function Icon({ icon: Component, size = 'md', className = '' }: IconProps) {
  return (
    <Component
      aria-hidden="true"
      className={`inline-block flex-shrink-0 ${sizeClasses[size]} ${className}`}
    />
  );
}
