import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getMe,
  updateMe,
  uploadAvatar,
  type User,
} from '../services/api';
import { PasswordChangeForm } from './PasswordChangeForm';
import { setAccessToken } from '../services/session';
import {
  Alert,
  Avatar,
  Button,
  ButtonLink,
  Card,
  Input,
  Spinner,
  StatBox,
  Title,
} from '../components/ui';

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] =
    useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] =
    useState(false);

  useEffect(() => {
    async function loadProfile() {
      const accessToken =
        localStorage.getItem('accessToken');

      if (!accessToken) {
        navigate('/login');
        return;
      }

      try {
        const profile = await getMe(accessToken);

        setUser(profile);
        setUsername(profile.username);
      } catch (error) {
        setAccessToken(null);

        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [navigate]);

  async function handleAvatarSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accessToken =
      localStorage.getItem('accessToken');

    if (!accessToken) {
      navigate('/login');
      return;
    }

    if (!avatarFile) {
      setError('Please select an avatar');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsUploadingAvatar(true);

    try {
      const updatedUser = await uploadAvatar(
        accessToken,
        avatarFile,
      );

      setUser(updatedUser);
      setAvatarFile(null);
      setSuccessMessage('Avatar updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accessToken =
      localStorage.getItem('accessToken');

    if (!accessToken) {
      navigate('/login');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const updatedUser = await updateMe(
        accessToken,
        {
          username,
        },
      );

      setUser(updatedUser);
      setUsername(updatedUser.username);
      setSuccessMessage('Profile updated successfully');
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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-950 text-white">
        <Spinner />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-950 px-4 text-white">
        <Card className="w-full max-w-md" padding="md">
          <Title level={1} className="mb-3 text-red-300">
            Unable to load profile
          </Title>
          <p className="mb-6 text-red-300">
            {error || 'User not found'}
          </p>
          <ButtonLink to="/login" variant="primary" size="lg">
            Return to login
          </ButtonLink>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm uppercase tracking-widest text-blue-400">
                Profile
              </p>
              <Title level={1} className="text-4xl">{user.username}</Title>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/')}
              >
                Back
              </Button>
              <ButtonLink
                to="/friends"
                variant="outline"
                size="sm"
                className="border-blue-500 text-blue-300 hover:bg-blue-500/10"
              >
                Friends
              </ButtonLink>
            </div>
          </div>

          {error && <Alert variant="error" className="mb-6">{error}</Alert>}
          {successMessage && <Alert variant="success" className="mb-6">{successMessage}</Alert>}

          <div className="mb-8 space-y-4">
            <StatBox label="User ID" value={String(user.id)} />
            <StatBox label="Email" value={user.email} />

            <div className="rounded-xl border border-stone-700 bg-stone-950 p-4">
              <p className="mb-3 text-sm text-stone-500">Avatar</p>
              <Avatar src={user.avatarUrl} alt={`Avatar de ${user.username}`} size="xl" />
            </div>
          </div>

          <form
            className="mb-8 border-t border-stone-700 pt-8"
            onSubmit={handleAvatarSubmit}
          >
            <Title level={2} className="mb-5">Change avatar</Title>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file =
                  event.target.files?.[0] ?? null;
                setAvatarFile(file);
              }}
              className="block w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-300"
            />

            <p className="mt-2 text-sm text-stone-500">
              JPEG, PNG or WebP — maximum 2 MB.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!avatarFile || isUploadingAvatar}
              className="mt-6 bg-blue-600 hover:bg-blue-500"
            >
              {isUploadingAvatar ? 'Uploading...' : 'Upload avatar'}
            </Button>
          </form>

          <form
            className="border-t border-stone-700 pt-8"
            onSubmit={handleProfileSubmit}
          >
            <Title level={2} className="mb-5">Edit profile</Title>

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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting || username.trim() === user.username}
              className="mt-6"
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </form>

          <PasswordChangeForm />
        </Card>
      </div>
    </main>
  );
}
