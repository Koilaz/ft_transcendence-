import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-abyss-950 p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/"
            className="rounded-lg bg-azur-500 hover:bg-azur-400 text-white py-2 px-6 font-semibold transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-abyss-300">
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
              <li>In-game chat messages, shared with the AI provider as described below</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Chat Messages and AI Processing</h2>
            <p>
              One seat at the table is held by a language model that must pass for a
              human player. Messages you send in the game chat may be stored by our
              servers, during the game and in server logs, to run the game, display
              the conversation history and investigate issues.
            </p>
            <p className="mt-4">
              To let the AI player talk and analyze each round, the game server sends
              the content of the current round (the messages of all players, along
              with their nicknames and in-game character names) to a large language
              model:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                Mistral AI (api.mistral.ai), when the game runs a Mistral-backed
                agent: the requests are processed on their side, under{' '}
                <a href="https://mistral.ai/terms" target="_blank" rel="noopener noreferrer" className="text-azur-400 hover:underline">
                  Mistral AI's terms and privacy policy
                </a>
                . Your account username and email address are not included in these
                requests;
              </li>
              <li>
                or a model running locally on our own server (Ollama), in which case
                the conversation never leaves the machine.
              </li>
            </ul>
            <p className="mt-4">
              These messages are used only to generate the AI player's replies and
              analyze each round. We do not send them anywhere else, and we do not
              use them for advertising or profiling.
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
              className="rounded-lg bg-azur-500 hover:bg-azur-400 text-white py-3 px-8 font-semibold transition-colors text-lg inline-block"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
