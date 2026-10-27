import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../services/api';
import { setAccessToken } from '../services/session';
import { Alert, AppLink, Button, Card, Input, Title } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const response = await login({
        email,
        password,
      });

      setAccessToken(response.accessToken);

      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <Card className="w-full">
          <Title level={1} className="mb-2">Log in</Title>

          <p className="mb-8 text-stone-400">
            Sign in to access your AImpostor account.
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={100}
              required
              autoComplete="current-password"
            />

            {error && <Alert variant="error">{error}</Alert>}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-400">
            No account yet?{' '}
            <AppLink to="/register">Create one</AppLink>
            {' | '}
            <AppLink to="/">Return to Home</AppLink>
          </p>
        </Card>
      </div>
    </main>
  );
}
