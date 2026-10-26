import { Link as RouterLink, type LinkProps } from 'react-router-dom';

type AppLinkProps = LinkProps;

export function AppLink({ className = '', children, ...props }: AppLinkProps) {
  return (
    <RouterLink className={`font-medium text-blue-400 hover:text-blue-300 transition-colors ${className}`} {...props}>
      {children}
    </RouterLink>
  );
}
