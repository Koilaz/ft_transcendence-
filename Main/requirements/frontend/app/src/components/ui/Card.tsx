import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: 'md' | 'lg';
};

const paddingClasses = {
  md: 'p-[clamp(1rem,3vw,1.5rem)]',
  lg: 'p-[clamp(1.25rem,4vw,2rem)]',
};

export function Card({ children, className = '', padding = 'lg' }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-stone-700 bg-stone-900 shadow-xl ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </section>
  );
}
