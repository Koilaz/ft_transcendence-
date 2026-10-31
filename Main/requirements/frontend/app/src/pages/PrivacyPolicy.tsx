import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/"
            className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 font-semibold transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
            <p>
              Welcome to ft_transcendence. We respect your privacy and are committed to protecting your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
            <p>
              We may collect the following types of information when you use our service:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Personal identification information (username, email address, etc.)</li>
              <li>Profile information and game statistics</li>
              <li>Authentication credentials</li>
              <li>Chat messages you send during a game</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Chat Messages and AI Processing</h2>
            <p>
              Messages you send in the game chat may be stored by our servers, during the game and in server logs,
              to run the game, display the conversation history and investigate issues.
            </p>
            <p className="mt-4">
              The AI player in each game is powered by the API of Mistral AI, a third-party provider.
              To generate its replies and analyze each round, the conversation history of the game
              (the messages of all players, along with their in-game character names) is sent to the Mistral AI API.
              Your account username and email address are not included. This data is then handled under{' '}
              <a href="https://mistral.ai/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Mistral AI's terms and privacy policy
              </a>.
            </p>
            <p className="mt-4">
              Do not share personal or sensitive information in the game chat.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, operate, and maintain our service</li>
              <li>Generate the AI player's replies through the Mistral AI API</li>
              <li>Improve and personalize your experience</li>
              <li>Communicate with you</li>
              <li>Enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information.
              However, please be aware that no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us.
            </p>
          </section>
          <div className="mt-12">
            <Link
              to="/"
              className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white py-3 px-8 font-semibold transition-colors text-lg inline-block"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
