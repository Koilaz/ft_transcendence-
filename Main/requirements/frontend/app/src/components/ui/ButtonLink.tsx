import { Link, type LinkProps } from 'react-router-dom';

type ButtonLinkVariant = 'primary' | 'secondary' | 'outline';
type ButtonLinkSize = 'sm' | 'md' | 'lg';

type ButtonLinkProps = LinkProps & {
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonLinkVariant, string> = {
  primary: 'bg-azur-500 text-abyss-900 hover:bg-azur-400',
  secondary: 'bg-abyss-800 text-white hover:bg-abyss-700',
  outline: 'border border-abyss-600 bg-transparent text-white hover:bg-abyss-800/50',
};

const sizeClasses: Record<ButtonLinkSize, string> = {
  sm: 'px-[clamp(0.5rem,2vw,0.75rem)] py-[clamp(0.25rem,1vw,0.375rem)] text-sm',
  md: 'px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.375rem,1vw,0.5rem)] text-sm',
  lg: 'px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.5rem,1.5vw,0.75rem)] text-base font-semibold',
};

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`inline-block rounded-lg font-medium text-center transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
