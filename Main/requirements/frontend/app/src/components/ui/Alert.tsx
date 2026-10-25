import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'success' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<AlertVariant, string> = {
  error: 'border-red-900 bg-red-950 text-red-300',
  success: 'border-blue-900 bg-blue-950 text-blue-300',
  info: 'border-stone-700 bg-stone-800 text-stone-300',
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
