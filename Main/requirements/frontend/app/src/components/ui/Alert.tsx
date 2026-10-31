import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'success' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<AlertVariant, string> = {
  error: 'border-danger-900 bg-danger-950 text-danger-400',
  success: 'border-azur-900 bg-azur-950 text-azur-400',
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
