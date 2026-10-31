import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'success' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<AlertVariant, string> = {
  error: 'border-danger-900 bg-danger-950 text-danger-400',
  // Le success est vert, comme partout ailleurs dans l'app (Rejouer, scores,
  // statut en ligne) : les trois variantes suivent le meme motif sombre
  // (bordure 900, fond 950, texte 400).
  success: 'border-success-900 bg-success-950 text-success-400',
  info: 'border-abyss-700 bg-abyss-800 text-abyss-300',
};

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  return (
    <p
      className={`rounded-lg border px-4 py-3 text-sm ${variantClasses[variant]} ${className}`}
    >
      {children}
    </p>
  );
}
