import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

export function Friends() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>(
    [],
  );
  const [sentRequests, setSentRequests] = useState<
    SentFriendRequestItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingUserId, setActionLoadingUserId] =
    useState<number | null>(null);
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
          updateUserPresence(
            user,
            message.userId,
            message.isOnline,
            message.lastSeenAt,
          ),
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
    return new Set(
      friends.map((friendship) => friendship.friend.id),
    );
  }, [friends]);

  const requestRequesterIds = useMemo(() => {
    return new Set(
      requests.map((request) => request.requester.id),
    );
  }, [requests]);

  const sentRequestReceiverIds = useMemo(() => {
    return new Set(
      sentRequests.map((request) => request.receiver.id),
    );
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
  }, [
    currentUser,
    friendIds,
    requestRequesterIds,
    sentRequestReceiverIds,
    users,
  ]);

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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading friends...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm uppercase tracking-widest text-sky-400">
              Social
            </p>

            <h1 className="text-4xl font-bold">Friends</h1>
          </div>

          <Link
            to="/profile"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-sky-500 hover:text-sky-300"
          >
            Back to profile
          </Link>
        </div>

        {error && (
          <p className="mb-6 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p className="mb-6 rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
            {success}
          </p>
        )}

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="mb-5 text-2xl font-semibold">
            Received requests
          </h2>

          {requests.length === 0 ? (
            <p className="text-sm text-slate-400">
              No pending friend requests.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        request.requester.avatarUrl ??
                        DEFAULT_AVATAR_URL
                      }
                      alt={`Avatar de ${request.requester.username}`}
                      className="h-12 w-12 rounded-full object-cover"
                    />

                    <div>
                      <p className="font-medium">
                        {request.requester.username}
                      </p>

                      <p className="text-xs text-slate-500">
                        Wants to be your friend
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleAcceptFriendRequest(
                        request.requester.id,
                      )
                    }
                    disabled={
                      actionLoadingUserId ===
                      request.requester.id
                    }
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="mb-5 text-2xl font-semibold">
            My friends
          </h2>

          {friends.length === 0 ? (
            <p className="text-sm text-slate-400">
              You have no friends yet.
            </p>
          ) : (
            <div className="space-y-3">
              {friends.map((friendship) => (
                <div
                  key={friendship.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        friendship.friend.avatarUrl ??
                        DEFAULT_AVATAR_URL
                      }
                      alt={`Avatar de ${friendship.friend.username}`}
                      className="h-12 w-12 rounded-full object-cover"
                    />

                    <div>
                      <p className="font-medium">
                        {friendship.friend.username}
                      </p>

                      <p
                        className={`flex items-center gap-2 text-xs ${
                          friendship.friend.isOnline
                            ? 'text-emerald-300'
                            : 'text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            friendship.friend.isOnline
                              ? 'bg-emerald-400'
                              : 'bg-slate-600'
                          }`}
                        />

                        {getPresenceText(friendship.friend)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleRemoveFriend(
                        friendship.friend.id,
                      )
                    }
                    disabled={
                      actionLoadingUserId ===
                      friendship.friend.id
                    }
                    className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="mb-5 text-2xl font-semibold">
            Find users
          </h2>

          {availableUsers.length === 0 ? (
            <p className="text-sm text-slate-400">
              No available users to add right now.
            </p>
          ) : (
            <div className="space-y-3">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        user.avatarUrl ?? DEFAULT_AVATAR_URL
                      }
                      alt={`Avatar de ${user.username}`}
                      className="h-12 w-12 rounded-full object-cover"
                    />

                    <div>
                      <p className="font-medium">
                        {user.username}
                      </p>

                      <p className="text-xs text-slate-500">
                        User
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleSendFriendRequest(user.id)
                    }
                    disabled={actionLoadingUserId === user.id}
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}