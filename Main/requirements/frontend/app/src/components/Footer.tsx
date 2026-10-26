import { Link } from 'react-router-dom';

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
            className="text-sm hover:text-gray-300 transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            to="/privacy-policy"
            className="text-sm hover:text-gray-300 transition-colors"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
