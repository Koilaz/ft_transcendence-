// @ts-nocheck
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function TermsOfService() {
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
        <h1 className="text-4xl font-bold text-black mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ft_transcendence, you agree to be bound by these Terms of Service.
              If you do not agree with any part of these terms, you may not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">2. User Responsibilities</h2>
            <p>
              As a user, you are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Providing accurate and complete information</li>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>Complying with all applicable laws and regulations</li>
              <li>Respecting other users and not engaging in abusive behavior</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">3. Prohibited Activities</h2>
            <p>
              You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the service for any illegal purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to accounts or systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Distribute spam, malware, or harmful content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">4. Intellectual Property</h2>
            <p>
              All content and materials available on ft_transcendence, including but not limited to text, graphics, logos, and software,
              are the property of the service providers and are protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">5. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account and access to the service at our sole discretion,
              without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">6. Disclaimer</h2>
            <p>
              The service is provided on an "as is" and "as available" basis. We disclaim all warranties of any kind,
              whether express or implied, including but not limited to the implied warranties of merchantability,
              fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">7. Limitation of Liability</h2>
            <p>
              In no event shall ft_transcendence or its affiliates be liable for any indirect, incidental, special,
              consequential, or punitive damages arising out of or in connection with your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of any significant changes.
              Your continued use of the service after such changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">9. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us.
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
