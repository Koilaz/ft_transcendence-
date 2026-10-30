import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../services/api';
import { setAccessToken } from '../services/session';
import {
  validateAll,
  validateField,
  type FieldName,
  type FormErrors,
  type FormValues,
} from '../services/loginValidation';
import { Alert, AppLink, Button, Card, Input, Title } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({
    email: '',
    password: '',
  });
  // Seuls les champs "touches" (blur ou submit) affichent leur erreur :
  // pas de rouge agressif des le premier rendu de la page.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  // L'alerte globale ne sert qu'aux erreurs serveur : identifiants invalides
  // (on ne dit pas quel champ est faux) ou reseau indisponible.
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setValue(name: FieldName, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);
    // Champ deja en erreur : on revalide en direct, le rouge disparait
    // des que la saisie redevient correcte.
    if (touched[name]) {
      const message = validateField(name, next);
      setErrors((previous) => ({ ...previous, [name]: message || undefined }));
    }
  }

  function handleBlur(name: FieldName) {
    setTouched((previous) => ({ ...previous, [name]: true }));
    const message = validateField(name, values);
    setErrors((previous) => ({ ...previous, [name]: message || undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setServerError('');

    // Au submit, tous les champs sont touches : le moindre champ invalide
    // bloque l'envoi et s'affiche en rouge, sans alerte globale.
    const nextErrors = validateAll(values);
    setTouched({ email: true, password: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const response = await login({
        email: values.email,
        password: values.password,
      });

      setAccessToken(response.accessToken);

      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred');
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

          {/* noValidate : la bulle native du navigateur ferait doublon avec
              les erreurs par champ ; required/minLength restent pour
              l'accessibilite. */}
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Input
              id="email"
              type="email"
              label="Email"
              value={values.email}
              onChange={(event) => setValue('email', event.target.value)}
              onBlur={() => handleBlur('email')}
              error={touched.email ? errors.email : undefined}
              required
              autoComplete="email"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={values.password}
              onChange={(event) => setValue('password', event.target.value)}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : undefined}
              minLength={8}
              maxLength={100}
              required
              autoComplete="current-password"
            />

            {serverError && <Alert variant="error">{serverError}</Alert>}

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
