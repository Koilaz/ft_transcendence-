import type { ReactNode } from 'react';

type BadgeColor = 'red' | 'blue' | 'green' | 'stone';

type BadgeProps = {
  color?: BadgeColor;
  children: ReactNode;
  className?: string;
};

const colorClasses: Record<BadgeColor, string> = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  green: 'bg-emerald-500 text-white',
  stone: 'bg-stone-700 text-white',
};

export function Badge({ color = 'stone', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`font-bangers text-[clamp(0.625rem,1vw,0.875rem)] px-2 py-0.5 rounded-md ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  );
}
