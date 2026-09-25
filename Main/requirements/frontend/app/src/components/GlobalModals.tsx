// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { useModal } from '../contexts/ModalContext';

export default function GlobalModals() {
  const { activeModal, setActiveModal } = useModal();

  return (
    <AnimatePresence>
      {activeModal === 'terms' && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            onClick={() => setActiveModal(null)}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl bg-stone-900 rounded-2xl border border-stone-700 shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl transition"
                aria-label="Close"
              >
                ×
              </button>
              <h1 className="mb-6 text-3xl font-bold text-white">Terms of Service</h1>
              <div className="space-y-6 text-stone-300 text-sm leading-relaxed">
                <p>
                  Welcome to AImpostor. By accessing or using our services, you agree to be bound by these Terms of Service.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">1. Acceptance of Terms</h2>
                <p>
                  You must be at least 13 years old to use our services. By creating an account or using our platform, you accept these terms in full.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">2. User Responsibilities</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use our services in compliance with all applicable laws and regulations.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">3. Prohibited Conduct</h2>
                <p>
                  You may not use our services to engage in any illegal activity, harass other users, or interfere with the proper functioning of our platform.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">4. Limitation of Liability</h2>
                <p>
                  To the fullest extent permitted by law, AImpostor shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.
                </p>
                <p className="pt-4 text-xs text-stone-500">
                  Last updated: August 2026
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {activeModal === 'privacy' && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            onClick={() => setActiveModal(null)}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl bg-stone-900 rounded-2xl border border-stone-700 shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl transition"
                aria-label="Close"
              >
                ×
              </button>
              <h1 className="mb-6 text-3xl font-bold text-white">Privacy Policy</h1>
              <div className="space-y-6 text-stone-300 text-sm leading-relaxed">
                <p>
                  This Privacy Policy describes how AImpostor collects, uses, and protects your personal information when you use our services.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">1. Information We Collect</h2>
                <p>
                  We may collect personal information such as your username, email address, and avatar when you register an account. We also collect game-related data to improve your experience.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">2. How We Use Your Information</h2>
                <p>
                  We use the information we collect to provide, maintain, and improve our services, as well as to communicate with you about your account and our platform.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">3. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.
                </p>
                <h2 className="text-xl font-semibold text-white pt-4 border-t border-stone-700">4. Third-Party Disclosure</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as required by law.
                </p>
                <p className="pt-4 text-xs text-stone-500">
                  Last updated: August 2026
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
