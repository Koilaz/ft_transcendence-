// @ts-nocheck
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/"
            className="rounded-lg bg-black text-[#FDFDFD] py-2 px-6 font-semibold hover:bg-gray-800 transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-black mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">Introduction</h2>
            <p>
              Welcome to ft_transcendence. We respect your privacy and are committed to protecting your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">Information We Collect</h2>
            <p>
              We may collect the following types of information when you use our service:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Personal identification information (username, email address, etc.)</li>
              <li>Profile information and game statistics</li>
              <li>Authentication credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, operate, and maintain our service</li>
              <li>Improve and personalize your experience</li>
              <li>Communicate with you</li>
              <li>Enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information.
              However, please be aware that no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us.
            </p>
          </section>
          <div className="mt-12">
            <Link
              to="/"
              className="rounded-lg bg-black text-[#FDFDFD] py-3 px-8 font-semibold hover:bg-gray-800 transition-colors text-lg inline-block"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
