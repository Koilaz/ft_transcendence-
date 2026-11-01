import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { buttonVariantClasses, buttonSizeClasses, type ButtonVariant, type ButtonSize } from './buttonStyles';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, icon, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${icon ? 'inline-flex items-center justify-center gap-2' : ''} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {icon && <Icon icon={icon} size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
