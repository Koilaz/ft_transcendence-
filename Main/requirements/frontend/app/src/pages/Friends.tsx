// @ts-nocheck
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Children,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  DEFAULT_AVATAR_URL,
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  getMe,
  getSentFriendRequests,
  getUsers,
  removeFriend,
  sendFriendRequest,
  type FriendListItem,
  type FriendRequestItem,
  type PublicUser,
  type SentFriendRequestItem,
  type User,
} from '../services/api';
import { connectPresenceSocket } from '../services/presenceSocket';

function updateUserPresence(
  user: PublicUser,
  userId: number,
  isOnline: boolean,
  lastSeenAt: string | null,
): PublicUser {
  if (user.id !== userId) {
    return user;
  }

  return {
    ...user,
    isOnline,
    lastSeenAt,
  };
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) {
    return 'Offline';
  }

  const date = new Date(lastSeenAt);

  if (Number.isNaN(date.getTime())) {
    return 'Offline';
  }

  return `Offline · last seen ${date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getPresenceText(user: PublicUser): string {
  if (user.isOnline) {
    return 'Online';
  }

  return formatLastSeen(user.lastSeenAt);
}

// --- Presence Dot Component ---
function PresenceDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${
        isOnline ? 'bg-green-400 shadow-[0_0_8px_#3ecf8e]' : 'bg-stone-600'
      }`}
    />
  );
}

// --- Card Components ---
function RequestCard({
  user,
  onAccept,
  acceptLoading,
}: {
  user: PublicUser;
  onAccept: () => void;
  acceptLoading: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-950 p-4"
    >
      <div className="flex items-center gap-3">
        <img
          src={user.avatarUrl ?? DEFAULT_AVATAR_URL}
          alt={`Avatar de ${user.username}`}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div>
          <p className="font-medium text-white">{user.username}</p>
          <p className="text-xs text-stone-500">Wants to be your friend</p>
        </div>
      </div>
      <motion.button
        type="button"
        onClick={onAccept}
        disabled={acceptLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {acceptLoading ? 'Loading...' : 'Accept'}
      </motion.button>
    </motion.div>
  );
}

function FriendCard({
  user,
  onRemove,
  removeLoading,
}: {
  user: PublicUser;
  onRemove: () => void;
  removeLoading: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-950 p-4"
    >
      <div className="flex items-center gap-3">
        <img
          src={user.avatarUrl ?? DEFAULT_AVATAR_URL}
          alt={`Avatar de ${user.username}`}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div>
          <p className="font-medium text-white">{user.username}</p>
          <p className={`flex items-center gap-2 text-xs ${
            user.isOnline ? 'text-green-300' : 'text-stone-500'
          }`}>
            <PresenceDot isOnline={user.isOnline} />
            {getPresenceText(user)}
          </p>
        </div>
      </div>
      <motion.button
        type="button"
        onClick={onRemove}
        disabled={removeLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {removeLoading ? 'Loading...' : 'Remove'}
      </motion.button>
    </motion.div>
  );
}

function UserCard({
  user,
  onAdd,
  addLoading,
}: {
  user: PublicUser;
  onAdd: () => void;
  addLoading: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-950 p-4"
    >
      <div className="flex items-center gap-3">
        <img
          src={user.avatarUrl ?? DEFAULT_AVATAR_URL}
          alt={`Avatar de ${user.username}`}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div>
          <p className="font-medium text-white">{user.username}</p>
          <p className="text-xs text-stone-500">User</p>
        </div>
      </div>
      <motion.button
        type="button"
        onClick={onAdd}
        disabled={addLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {addLoading ? 'Loading...' : 'Add friend'}
      </motion.button>
    </motion.div>
  );
}

// --- Section Component ---
function Section({
  title,
  children,
  emptyMessage,
}: {
  title: string;
  children: React.ReactNode;
  emptyMessage: string;
}) {
  const hasContent = children && Children.count(children) > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10 rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-xl"
    >
      <h2 className="mb-5 text-2xl font-semibold text-white">{title}</h2>
      {hasContent ? children : <p className="text-sm text-stone-400">{emptyMessage}</p>}
    </motion.section>
  );
}

// --- Notification Component ---
function Notification({ message, type }: { message: string; type: 'error' | 'success' }) {
  const colors = {
    error: {
      border: 'border-red-900',
      bg: 'bg-red-950',
      text: 'text-red-300',
    },
    success: {
      border: 'border-emerald-900',
      bg: 'bg-emerald-950',
      text: 'text-emerald-300',
    },
  };

  return (
    <motion.p
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`mb-6 rounded-lg border ${colors[type].border} ${colors[type].bg} px-4 py-3 text-sm ${colors[type].text}`}
    >
      {message}
    </motion.p>
  );
}

export default function Friends() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<SentFriendRequestItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFriendsPage = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [
        profile,
        allUsers,
        friendList,
        receivedRequests,
        sentFriendRequests,
      ] = await Promise.all([
        getMe(accessToken),
        getUsers(),
        getFriends(),
        getFriendRequests(),
        getSentFriendRequests(),
      ]);

      setCurrentUser(profile);
      setUsers(allUsers);
      setFriends(friendList);
      setRequests(receivedRequests);
      setSentRequests(sentFriendRequests);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load friends');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFriendsPage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFriendsPage]);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      return;
    }

    const socket = connectPresenceSocket(accessToken, (message) => {
      if (message.type !== 'presence:update') {
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          updateUserPresence(user, message.userId, message.isOnline, message.lastSeenAt),
        ),
      );

      setFriends((currentFriends) =>
        currentFriends.map((friendship) => ({
          ...friendship,
          friend: updateUserPresence(
            friendship.friend,
            message.userId,
            message.isOnline,
            message.lastSeenAt,
          ),
        })),
      );

      setRequests((currentRequests) =>
        currentRequests.map((request) => ({
          ...request,
          requester: updateUserPresence(
            request.requester,
            message.userId,
            message.isOnline,
            message.lastSeenAt,
          ),
        })),
      );

      setSentRequests((currentSentRequests) =>
        currentSentRequests.map((request) => ({
          ...request,
          receiver: updateUserPresence(
            request.receiver,
            message.userId,
            message.isOnline,
            message.lastSeenAt,
          ),
        })),
      );
    });

    return () => {
      socket.close(1000, 'Leaving friends page');
    };
  }, []);

  const friendIds = useMemo(() => {
    return new Set(friends.map((friendship) => friendship.friend.id));
  }, [friends]);

  const requestRequesterIds = useMemo(() => {
    return new Set(requests.map((request) => request.requester.id));
  }, [requests]);

  const sentRequestReceiverIds = useMemo(() => {
    return new Set(sentRequests.map((request) => request.receiver.id));
  }, [sentRequests]);

  const availableUsers = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return users.filter((user) => {
      if (user.id === currentUser.id) {
        return false;
      }
      if (friendIds.has(user.id)) {
        return false;
      }
      if (requestRequesterIds.has(user.id)) {
        return false;
      }
      if (sentRequestReceiverIds.has(user.id)) {
        return false;
      }
      return true;
    });
  }, [currentUser, friendIds, requestRequesterIds, sentRequestReceiverIds, users]);

  async function handleSendFriendRequest(userId: number) {
    setActionLoadingUserId(userId);
    setError('');
    setSuccess('');

    try {
      await sendFriendRequest(userId);
      await loadFriendsPage();
      setSuccess('Friend request sent.');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to send friend request');
      }
    } finally {
      setActionLoadingUserId(null);
    }
  }

  async function handleAcceptFriendRequest(userId: number) {
    setActionLoadingUserId(userId);
    setError('');
    setSuccess('');

    try {
      await acceptFriendRequest(userId);
      await loadFriendsPage();
      setSuccess('Friend request accepted.');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to accept friend request');
      }
    } finally {
      setActionLoadingUserId(null);
    }
  }

  async function handleRemoveFriend(userId: number) {
    setActionLoadingUserId(userId);
    setError('');
    setSuccess('');

    try {
      await removeFriend(userId);
      await loadFriendsPage();
      setSuccess('Friend removed.');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to remove friend');
      }
    } finally {
      setActionLoadingUserId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-200">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-stone-400"
        >
          Loading friends...
        </motion.p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-12 text-stone-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex items-center justify-between gap-4"
        >
          <div>
            <p className="mb-2 text-sm uppercase tracking-widest text-green-400">
              Social
            </p>
            <h1 className="text-4xl font-bold text-white">Friends</h1>
          </div>

          <Link
            to="/profile"
            className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-green-500 hover:text-green-300"
          >
            Back to profile
          </Link>
        </motion.div>

        {/* Notifications */}
        <AnimatePresence mode="wait">
          {error && <Notification key="error" message={error} type="error" />}
          {success && <Notification key="success" message={success} type="success" />}
        </AnimatePresence>

        {/* Received Requests */}
        <Section title="Received requests" emptyMessage="No pending friend requests.">
          {requests.length > 0 && (
            <motion.div layout className="space-y-3">
              <AnimatePresence mode="popLayout">
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    user={request.requester}
                    onAccept={() => void handleAcceptFriendRequest(request.requester.id)}
                    acceptLoading={actionLoadingUserId === request.requester.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </Section>

        {/* My Friends */}
        <Section title="My friends" emptyMessage="You have no friends yet.">
          {friends.length > 0 && (
            <motion.div layout className="space-y-3">
              <AnimatePresence mode="popLayout">
                {friends.map((friendship) => (
                  <FriendCard
                    key={friendship.id}
                    user={friendship.friend}
                    onRemove={() => void handleRemoveFriend(friendship.friend.id)}
                    removeLoading={actionLoadingUserId === friendship.friend.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </Section>

        {/* Find Users */}
        <Section title="Find users" emptyMessage="No available users to add right now.">
          {availableUsers.length > 0 && (
            <motion.div layout className="space-y-3">
              <AnimatePresence mode="popLayout">
                {availableUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onAdd={() => void handleSendFriendRequest(user.id)}
                    addLoading={actionLoadingUserId === user.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </Section>
      </motion.div>
    </main>
  );
}
