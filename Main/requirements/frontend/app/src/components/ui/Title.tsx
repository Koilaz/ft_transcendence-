import type { ReactNode } from 'react';

type TitleLevel = 1 | 2;

type TitleProps = {
  level?: TitleLevel;
  children: ReactNode;
  className?: string;
};

const levelClasses: Record<TitleLevel, string> = {
  1: 'text-[clamp(1.5rem,4vw,1.875rem)] font-bold',
  2: 'text-[clamp(1.25rem,3vw,1.5rem)] font-semibold',
};

const Tag = ({ level, children, className }: { level: TitleLevel; children: ReactNode; className: string }) => {
  const TagComponent = `h${level}` as 'h1' | 'h2';
  return <TagComponent className={className}>{children}</TagComponent>;
};

export function Title({ level = 1, children, className = '' }: TitleProps) {
  return (
    <Tag
      level={level}
      className={`${levelClasses[level]} text-white ${className}`}
    >
      {children}
    </Tag>
  );
}
