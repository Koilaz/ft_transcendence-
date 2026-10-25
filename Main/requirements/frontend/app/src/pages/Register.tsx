import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { register } from '../services/api';
import { Alert, AppLink, Button, Card, Input, Title } from '../components/ui';

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');

    // La confirmation evite la faute de frappe qui verrouille le compte :
    // verifiee ici, le serveur n'en veut pas.
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        username,
        email,
        password,
      });

      navigate('/login');
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
          <Title level={1} className="mb-2">Create account</Title>

          <p className="mb-8 text-stone-400">
            Join AImpostor and create your profile.
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              id="username"
              type="text"
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={20}
              required
              autoComplete="username"
            />

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
              autoComplete="new-password"
            />

            <Input
              id="confirm-password"
              type="password"
              label="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={100}
              required
              autoComplete="new-password"
            />

            {error && <Alert variant="error">{error}</Alert>}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-400">
            Already registered?{' '}
            <AppLink to="/login">Log in</AppLink>
            {' | '}
            <AppLink to="/">Return to Home</AppLink>
          </p>
        </Card>
      </div>
    </main>
  );
}
