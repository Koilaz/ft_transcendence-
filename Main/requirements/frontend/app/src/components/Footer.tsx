import { Link } from 'react-router-dom';
import { FileText, ShieldCheck } from 'lucide-react';
import { Icon } from './ui/Icon';

export default function Footer() {
  return (
    <footer className="bg-black text-white py-8 px-4 w-full">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} ft_transcendence. All rights reserved.
          </p>
        </div>
        <nav className="flex gap-6">
          <Link
            to="/terms-of-service"
            className="flex items-center gap-1.5 text-sm hover:text-abyss-300 transition-colors"
          >
            <Icon icon={FileText} size="sm" />
            Terms of Service
          </Link>
          <Link
            to="/privacy-policy"
            className="flex items-center gap-1.5 text-sm hover:text-abyss-300 transition-colors"
          >
            <Icon icon={ShieldCheck} size="sm" />
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
