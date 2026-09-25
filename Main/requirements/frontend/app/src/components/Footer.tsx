// @ts-nocheck
import { useModal } from '../contexts/ModalContext';

export default function Footer() {
  const { setActiveModal } = useModal();

  return (
    <footer className="bg-black text-white py-8 px-4 w-full">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} ft_transcendence. All rights reserved.
          </p>
        </div>
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveModal('terms')}
            className="text-sm hover:text-gray-300 transition-colors"
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveModal('privacy')}
            className="text-sm hover:text-gray-300 transition-colors"
          >
            Privacy Policy
          </button>
        </nav>
      </div>
    </footer>
  );
}
