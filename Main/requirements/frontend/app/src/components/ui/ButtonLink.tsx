import { Link, type LinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { buttonVariantClasses, buttonSizeClasses, type ButtonVariant, type ButtonSize } from './buttonStyles';

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: LucideIcon;
};

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`rounded-lg font-medium transition-colors ${icon ? 'inline-flex items-center justify-center gap-2' : 'inline-block text-center'} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <Icon icon={icon} size="sm" />}
      {children}
    </Link>
  );
}
