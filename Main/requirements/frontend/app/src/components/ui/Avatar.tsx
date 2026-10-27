import { DEFAULT_AVATAR_URL } from '../../services/api';

type AvatarProps = {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const sizeClasses = {
  sm: 'h-[clamp(1.5rem,5vw,2rem)] w-[clamp(1.5rem,5vw,2rem)]',
  md: 'h-[clamp(3rem,10vw,4rem)] w-[clamp(3rem,10vw,4rem)]',
  lg: 'h-[clamp(4rem,15vw,6rem)] w-[clamp(4rem,15vw,6rem)]',
  xl: 'h-[clamp(4rem,20vw,8rem)] w-[clamp(4rem,20vw,8rem)]',
};

export function Avatar({ src, alt, size = 'md', className = '' }: AvatarProps) {
  return (
    <img
      src={src ?? DEFAULT_AVATAR_URL}
      alt={alt}
      className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
    />
  );
}
