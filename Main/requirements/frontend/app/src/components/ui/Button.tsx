import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-azur-500 text-abyss-900 hover:bg-azur-400',
  secondary: 'bg-abyss-800 text-white hover:bg-abyss-700',
  outline: 'border border-abyss-600 bg-transparent text-white hover:bg-abyss-800/50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-[clamp(0.5rem,2vw,0.75rem)] py-[clamp(0.25rem,1vw,0.375rem)] text-sm',
  md: 'px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.375rem,1vw,0.5rem)] text-sm',
  lg: 'px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.5rem,1.5vw,0.75rem)] text-base font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, icon, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${icon ? 'inline-flex items-center justify-center gap-2' : ''} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {icon && <Icon icon={icon} size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
