import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { register } from '../services/api';
import {
  validateAll,
  validateField,
  type FieldName,
  type FormErrors,
  type FormValues,
} from '../services/registerValidation';
import { Alert, AppLink, Button, Card, Input, Title } from '../components/ui';

export default function Register() {
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  // Seuls les champs "touches" (blur ou submit) affichent leur erreur :
  // pas de rouge agressif des le premier rendu de la page.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  // L'alerte globale ne sert plus qu'aux erreurs serveur (compte deja
  // pris, reseau indisponible) : les erreurs de saisie vivent sur les champs.
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
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await register({
        username: values.username,
        email: values.email,
        password: values.password,
      });

      navigate('/login');
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
    <main className="min-h-screen bg-abyss-950 px-4 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <Card className="w-full">
          <Title level={1} className="mb-2">Create account</Title>

          <p className="mb-8 text-abyss-400">
            Join AImpostor and create your profile.
          </p>

          {/* noValidate : la bulle native du navigateur ferait doublon avec
              les erreurs par champ ; required/minLength restent pour
              l'accessibilite. */}
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Input
              id="username"
              type="text"
              label="Username"
              value={values.username}
              onChange={(event) => setValue('username', event.target.value)}
              onBlur={() => handleBlur('username')}
              error={touched.username ? errors.username : undefined}
              minLength={3}
              maxLength={20}
              required
              autoComplete="username"
            />

            <Input
              id="email"
              type="email"
              spellCheck={false}
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
              autoComplete="new-password"
            />

            <Input
              id="confirm-password"
              type="password"
              label="Confirm password"
              value={values.confirmPassword}
              onChange={(event) => setValue('confirmPassword', event.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              minLength={8}
              maxLength={100}
              required
              autoComplete="new-password"
            />

            {serverError && <Alert variant="error">{serverError}</Alert>}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-abyss-400">
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
