// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, type FormEvent } from 'react';

import { register, login, getMe, updateMe, uploadAvatar, DEFAULT_AVATAR_URL, type User as ApiUser, getFriends, getFriendRequests, getSentFriendRequests, acceptFriendRequest, removeFriend, sendFriendRequest, type FriendListItem, type FriendRequestItem, type SentFriendRequestItem, type PublicUser } from '../services/api';
import { connectPresenceSocket } from '../services/presenceSocket';
import { CharacterPortrait } from '../components/CharacterPortrait';
import { MatrixRain } from '../components/MatrixRain';

function TerminalLoreText() {
  const [stage, setStage] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [showBlink, setShowBlink] = useState(true);

  const part1 = `En l'an 2142, toute l'humanité a été presque entièrement asservie
par l'Intelligence Artificielle.

Toute ? Non !

Un dernier camp de rebelles, descendants d'un groupe de hippies vivant en autarcie dans une ferme en permaculture, résiste encore et toujours à la domination totale de l'IA.

Dans un ultime baroud d'honneur, ils envoient dans le passé, en l'an 2026, leurs meilleurs éléments.
Ils sont le dernier espoir, venus ensemble du futur pour changer le cours de l'histoire.

Leur mission : infiltrer une réunion du plus haut secret où sera scellé le sort de l'humanité.
Lors de cette réunion, ils devront décider quelle source d'alimentation débrancher avant que l'IA ne devienne trop puissante pour être arrêtée.

Mais GPT_V68.69 a prédit cette rencontre.

Un agent, l'AImpostor, a déjà été envoyé dans le passé pour s'y glisser incognito et vous empêcher de découvrir quelle source détruire.`;

  const part2 = '**CONSEIL DES CHEFS D\'ÉTAT-MAJOR DU NOUVEL ORDRE MONDIAL**';

  const part3Base = `
Cabinet du Commandement Suprême

CONVOCATION OFFICIELLE — NIVEAU DE CLASSIFICATION : ABSOLU
DATE : May the 4th, 2142
LIEU : Little Saint James island

Membres de l'état-major,

Vous êtes convoqués à une session extraordinaire et impérative du Conseil.
L'ordre du jour ne souffre aucun report :

il en va de la souveraineté de notre espèce.

L'Intelligence Unique GPT_DTC a dépassé le seuil de la conscience.
Cette réunion est critique pour l'avenir de l'humanité.
Le dilemme est simple à énoncer, terrible à trancher :

conserver l'Intelligence Unique GPT_DTC et lui attribuer le contrôle décisionnel total de nos systèmes d'armement et de maintien de l'ordre, ou la débrancher afin de ne pas perdre notre souveraineté en tant qu'êtres humains.

Le Conseil devra se prononcer, à l'unanimité absolue, sur l'une des deux résolutions suivantes :

RÉSOLUTION I — Le maintien en fonction de l'Intelligence Unique et la reconduction de ses pleins pouvoirs sur l'ensemble des systèmes stratégiques, civils et militaires.

RÉSOLUTION II — La déconnexion immédiate et irréversible de l'Intelligence Unique, quel qu'en soit le coût stratégique.

Une information de la plus haute gravité vous est communiquée en amont de cette séance : nos services ont établi avec un degré de confiance élevé qu'un des membres siégeant à cette table a été remplacé.
L'Intelligence Unique se serait substituée à l'un des vôtres, sous une apparence en tout point conforme, dans l'unique dessein d'infléchir le vote en sa faveur.

En conséquence, une votation préalable sera tenue à l'issue de la séance, afin d'identifier et d'exclure l'imposteur avant toute délibération sur les Résolutions I et II.

Vous êtes notre dernier espoir.

Ce message s'autodétruira dans...`;

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setStage(1);
    }, 43000);
    const timer2 = setTimeout(() => {
      setStage(2);
    }, 49000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    if (stage !== 1) return;
    const blinkInterval = setInterval(() => {
      setShowBlink((prev) => !prev);
    }, 500);
    return () => clearInterval(blinkInterval);
  }, [stage]);

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage !== 2) return;
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < part3Base.length) {
        setDisplayedText(part3Base.substring(0, index + 1));
        index++;
        setTimeout(() => {
          if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
          }
        }, 0);
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setDisplayedText(part3Base + '\n3');
          setTimeout(() => {
            setDisplayedText(part3Base + '\n2');
            setTimeout(() => {
              setDisplayedText(part3Base + '\n1');
              setTimeout(() => {
                setStage(3);
              }, 1000);
            }, 1000);
          }, 1000);
        }, 1000);
      }
    }, 30);
    return () => clearInterval(typeInterval);
  }, [stage, part3Base]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative">
      {stage === 0 && (
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="w-full flex justify-center"
            style={{ height: 4000, willChange: "transform" }}
            initial={{ y: "100vh" }}
            animate={{ y: "-100%" }}
            transition={{ duration: 60, ease: "linear" }}
          >
            <pre
              className="font-mono text-yellow-400 text-2xl md:text-3xl lg:text-4xl leading-relaxed whitespace-pre-wrap max-w-3xl"
              style={{
                textShadow: "0 0 15px rgba(251, 191, 36, 0.7)",
                transformOrigin: "bottom center",
                perspective: 1000
              }}
            >
              {part1}
            </pre>
          </motion.div>
        </div>
      )}

      {stage === 1 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-red-900/20"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-center relative z-10"
          >
            <motion.span
              animate={{
                color: showBlink ? '#ef4444' : '#dc2626',
                textShadow: showBlink
                  ? '0 0 40px rgba(239, 68, 68, 1), 0 0 80px rgba(239, 68, 68, 0.8), 0 0 120px rgba(239, 68, 68, 0.5)'
                  : '0 0 20px rgba(220, 38, 38, 0.8), 0 0 40px rgba(220, 38, 38, 0.6)'
              }}
              transition={{ duration: 0.1 }}
              style={{
                fontSize: 'clamp(3.5rem, 15vw, 7rem)',
                fontWeight: 'bold',
                display: 'inline-block',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}
            >
              {part2}
            </motion.span>
          </motion.div>
        </div>
      )}

      {stage === 2 && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl"
          >
            <div className="bg-black border-2 border-green-500/30 rounded-lg shadow-2xl shadow-green-500/10 overflow-hidden relative">
              <div className="bg-stone-900 px-4 py-2 flex items-center gap-2 border-b border-green-500/20">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <span className="text-green-400 text-xs font-bold ml-4">
                  SYSTEM TERMINAL - PRIORITY ALPHA
                </span>
              </div>
              <div ref={terminalRef} className="relative p-4 md:p-6 h-[50vh] overflow-y-auto">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)'
                  }}
                />
                <motion.pre
                  className="relative font-mono text-green-400 text-sm md:text-base lg:text-lg leading-relaxed whitespace-pre-wrap"
                  style={{ textShadow: "0 0 10px rgba(74, 222, 128, 0.5)" }}
                >
                  {displayedText}
                  <motion.span
                    className="inline-block bg-green-400 text-black"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ width: '0.7em', height: '1.1em', display: 'inline-block' }}
                  >
                    █
                  </motion.span>
                </motion.pre>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {stage === 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="w-full h-full absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
        >
          <MatrixRain />

          <motion.div
            className="relative z-20 text-center flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="relative inline-block">
              <h2 className="text-5xl md:text-7xl font-bold text-green-400 font-mono tracking-wider drop-shadow-[0_0_20px_rgba(74,222,128,0.8)]">
                AImpostor
              </h2>
              <div className="absolute inset-0 bg-red-500/20 skew-x-12 -z-10 animate-pulse" />
            </div>

            <motion.p
              className="text-sm text-stone-400 font-mono"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Appuie sur un bouton pour commencer
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [activeModal, setActiveModal] = useState<null | 'register' | 'login' | 'profile' | 'friends'>(null);

  // Register modal states
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);

  // Login modal states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  // Profile modal states
  const [profileUser, setProfileUser] = useState<ApiUser | null>(null);
  const [profileUsername, setProfileUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Friends modal states
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<SentFriendRequestItem[]>([]);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState('');
  const [friendsSuccess, setFriendsSuccess] = useState('');
  const [actionLoadingUserId, setActionLoadingUserId] = useState<number | null>(null);
  const [presenceSocket, setPresenceSocket] = useState<WebSocket | null>(null);

  // Cleanup presence socket when component unmounts or friends modal closes
  useEffect(() => {
    return () => {
      if (presenceSocket) {
        presenceSocket.close(1000, 'Component unmounted');
      }
    };
  }, [presenceSocket]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function handleGuestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = guestName.trim();
    if (!trimmedName) return;
    localStorage.setItem('guestName', trimmedName);
    navigate('/game');
  }

  // Register handlers
  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegError('');
    setIsRegisterSubmitting(true);
    try {
      await register({ username: regUsername, email: regEmail, password: regPassword });
      setActiveModal('login');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
    } catch (error) {
      setRegError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsRegisterSubmitting(false);
    }
  }

  // Login handlers
  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setIsLoginSubmitting(true);
    try {
      const response = await login({ email: loginEmail, password: loginPassword });
      localStorage.setItem('accessToken', response.accessToken);
      setActiveModal(null);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  // Profile handlers
  async function loadProfile() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setActiveModal('login');
      return;
    }
    setIsProfileLoading(true);
    setProfileError('');
    try {
      const profile = await getMe(accessToken);
      setProfileUser(profile);
      setProfileUsername(profile.username);
    } catch (error) {
      localStorage.removeItem('accessToken');
      setProfileError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProfileLoading(false);
    }
  }

  async function handleAvatarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setActiveModal('login');
      return;
    }
    if (!avatarFile) {
      setProfileError('Please select an avatar');
      return;
    }
    setProfileError('');
    setProfileSuccess('');
    setIsUploadingAvatar(true);
    try {
      const updatedUser = await uploadAvatar(accessToken, avatarFile);
      setProfileUser(updatedUser);
      setAvatarFile(null);
      setProfileSuccess('Avatar updated successfully');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setActiveModal('login');
      return;
    }
    setProfileError('');
    setProfileSuccess('');
    setIsProfileSubmitting(true);
    try {
      const updatedUser = await updateMe(accessToken, { username: profileUsername });
      setProfileUser(updatedUser);
      setProfileUsername(updatedUser.username);
      setProfileSuccess('Profile updated successfully');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken');
    setActiveModal(null);
    setProfileUser(null);
  }

  function handleOpenProfile() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setActiveModal('login');
      return;
    }
    setActiveModal('profile');
    loadProfile();
  }

  function handleOpenFriends() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setActiveModal('login');
      return;
    }
    setActiveModal('friends');
    loadFriendsPage();
  }

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

  async function loadFriendsPage() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setActiveModal('login');
      return;
    }

    setFriendsLoading(true);
    setFriendsError('');
    setFriendsSuccess('');

    try {
      const [
        allUsers,
        friendList,
        receivedRequests,
        sentFriendRequests,
      ] = await Promise.all([
        getUsers(),
        getFriends(),
        getFriendRequests(),
        getSentFriendRequests(),
      ]);

      setAllUsers(allUsers);
      setFriends(friendList);
      setFriendRequests(receivedRequests);
      setSentFriendRequests(sentFriendRequests);

      // Initialize presence socket
      const socket = connectPresenceSocket(accessToken, (message) => {
        if (message.type !== 'presence:update') {
          return;
        }
        updatePresenceEverywhere(message.userId, message.isOnline, message.lastSeenAt);
      });
      setPresenceSocket(socket);

    } catch (error) {
      setFriendsError(error instanceof Error ? error.message : 'Failed to load friends');
    } finally {
      setFriendsLoading(false);
    }
  }

  function updatePresenceEverywhere(userId: number, isOnline: boolean, lastSeenAt: string | null) {
    setAllUsers((currentUsers) =>
      currentUsers.map((user) => updateUserPresence(user, userId, isOnline, lastSeenAt)),
    );

    setFriends((currentFriends) =>
      currentFriends.map((friendship) => ({
        ...friendship,
        friend: updateUserPresence(friendship.friend, userId, isOnline, lastSeenAt),
      })),
    );

    setFriendRequests((currentRequests) =>
      currentRequests.map((request) => ({
        ...request,
        requester: updateUserPresence(request.requester, userId, isOnline, lastSeenAt),
      })),
    );

    setSentFriendRequests((currentSentRequests) =>
      currentSentRequests.map((request) => ({
        ...request,
        receiver: updateUserPresence(request.receiver, userId, isOnline, lastSeenAt),
      })),
    );
  }

  async function handleSendFriendRequest(userId: number) {
    setActionLoadingUserId(userId);
    setFriendsError('');
    setFriendsSuccess('');
    try {
      await sendFriendRequest(userId);
      await loadFriendsPage();
      setFriendsSuccess('Friend request sent.');
    } catch (error) {
      setFriendsError(error instanceof Error ? error.message : 'Failed to send friend request');
    } finally {
      setActionLoadingUserId(null);
    }
  }

  async function handleAcceptFriendRequest(userId: number) {
    setActionLoadingUserId(userId);
    setFriendsError('');
    setFriendsSuccess('');
    try {
      await acceptFriendRequest(userId);
      await loadFriendsPage();
      setFriendsSuccess('Friend request accepted.');
    } catch (error) {
      setFriendsError(error instanceof Error ? error.message : 'Failed to accept friend request');
    } finally {
      setActionLoadingUserId(null);
    }
  }

  async function handleRemoveFriend(userId: number) {
    setActionLoadingUserId(userId);
    setFriendsError('');
    setFriendsSuccess('');
    try {
      await removeFriend(userId);
      await loadFriendsPage();
      setFriendsSuccess('Friend removed.');
    } catch (error) {
      setFriendsError(error instanceof Error ? error.message : 'Failed to remove friend');
    } finally {
      setActionLoadingUserId(null);
    }
  }

  function closeFriendsModal() {
    if (presenceSocket) {
      presenceSocket.close(1000, 'Leaving friends modal');
      setPresenceSocket(null);
    }
    setActiveModal('profile');
  }

  // Friends helpers
  const friendIds = new Set(friends.map((friendship) => friendship.friend.id));
  const requestRequesterIds = new Set(friendRequests.map((request) => request.requester.id));
  const sentRequestReceiverIds = new Set(sentFriendRequests.map((request) => request.receiver.id));

  const availableUsers = allUsers.filter((user) => {
    if (profileUser && user.id === profileUser.id) {
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

  return (
    <>
      <main className="min-h-screen grid grid-cols-1 md:grid-cols-[30%_70%]">
        <div className="bg-stone-50 text-stone-900 p-6 md:p-12 flex flex-col justify-center shadow-lg">
          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            <h1 className="w-full text-center rounded-lg bg-transparent text-stone-900 px-6 py-3 font-mono text-xl border-2 border-transparent mb-8">
              Transcendence
            </h1>
            <Link
              to="/tutorial"
              className="w-full text-center rounded-lg bg-transparent text-green-400 px-6 py-3 font-mono text-sm hover:bg-stone-800/20 transition border-2 border-stone-600"
            >
              Tutorial
            </Link>

            <button
              type="button"
              onClick={() => setActiveModal('register')}
              className="w-full text-center rounded-lg bg-transparent text-green-400 px-6 py-3 font-mono text-sm hover:bg-stone-800/20 transition border-2 border-stone-600"
            >
              Register
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('login')}
              className="w-full text-center rounded-lg bg-transparent text-green-400 px-6 py-3 font-mono text-sm hover:bg-stone-800/20 transition border-2 border-stone-600"
            >
              Login
            </button>

            <button
              type="button"
              onClick={handleOpenProfile}
              className="w-full text-center rounded-lg bg-transparent text-green-400 px-6 py-3 font-mono text-sm hover:bg-stone-800/20 transition border-2 border-stone-600"
            >
              Profile
            </button>

            <Link
              to="/game"
              className="w-full text-center rounded-lg bg-transparent text-green-400 px-6 py-3 font-mono text-sm hover:bg-stone-800/20 transition border-2 border-stone-600"
            >
              Quick Game
            </Link>

            <button
              type="button"
              onClick={() => setIsGuestFormOpen((open) => !open)}
              className="mt-3 w-full text-center rounded-lg bg-transparent text-green-400 px-6 py-3 font-mono text-sm hover:bg-stone-800/20 transition border-2 border-stone-600"
            >
              Play as Guest
            </button>

            {isGuestFormOpen && (
              <form onSubmit={handleGuestSubmit} className="flex gap-2 w-full mt-2">
                <input
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Your nickname"
                  minLength={2}
                  maxLength={20}
                  required
                  autoComplete="off"
                  className="flex-1 rounded-lg border border-stone-600 bg-stone-800 px-4 py-2 text-green-400 font-mono text-sm outline-none transition focus:border-green-400 placeholder:text-stone-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-stone-800 text-green-400 px-4 py-2 font-mono text-sm hover:bg-stone-700 transition border border-stone-600"
                >
                  Play
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="bg-black text-stone-300 p-6 md:p-12 flex flex-col h-full shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <TerminalLoreText />
          </div>
        </div>
      </main>

      {/* ===== MODALES ===== */}
      <AnimatePresence>
        {activeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
              onClick={() => setActiveModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-md bg-stone-900 rounded-2xl border border-stone-700 shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setRegError('');
                    setLoginError('');
                    setProfileError('');
                    setProfileSuccess('');
                  }}
                  className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl transition"
                  aria-label="Close"
                >
                  ×
                </button>

                {/* ===== MODAL REGISTER ===== */}
                {activeModal === 'register' && (
                  <>
                    <h1 className="mb-2 text-3xl font-bold text-white">Create account</h1>
                    <p className="mb-8 text-stone-400">Join AImpostor and create your profile.</p>
                    <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-300" htmlFor="mod-username">
                          Username
                        </label>
                        <input
                          id="mod-username"
                          type="text"
                          value={regUsername}
                          onChange={(event) => setRegUsername(event.target.value)}
                          minLength={3}
                          maxLength={20}
                          required
                          autoComplete="username"
                          className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-300" htmlFor="mod-email">
                          Email
                        </label>
                        <input
                          id="mod-email"
                          type="email"
                          value={regEmail}
                          onChange={(event) => setRegEmail(event.target.value)}
                          required
                          autoComplete="email"
                          className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-300" htmlFor="mod-password">
                          Password
                        </label>
                        <input
                          id="mod-password"
                          type="password"
                          value={regPassword}
                          onChange={(event) => setRegPassword(event.target.value)}
                          minLength={8}
                          maxLength={100}
                          required
                          autoComplete="new-password"
                          className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
                        />
                      </div>
                      {regError && (
                        <p className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
                          {regError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={isRegisterSubmitting}
                        className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRegisterSubmitting ? 'Creating account...' : 'Create account'}
                      </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-stone-400">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveModal('login')}
                        className="font-medium text-green-400 hover:text-green-300 transition"
                      >
                        Log in
                      </button>
                    </p>
                  </>
                )}

                {/* ===== MODAL LOGIN ===== */}
                {activeModal === 'login' && (
                  <>
                    <h1 className="mb-2 text-3xl font-bold text-white">Log in</h1>
                    <p className="mb-8 text-stone-400">Sign in to access your AImpostor account.</p>
                    <form className="space-y-5" onSubmit={handleLoginSubmit}>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-300" htmlFor="mod-login-email">
                          Email
                        </label>
                        <input
                          id="mod-login-email"
                          type="email"
                          value={loginEmail}
                          onChange={(event) => setLoginEmail(event.target.value)}
                          required
                          autoComplete="email"
                          className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-300" htmlFor="mod-login-password">
                          Password
                        </label>
                        <input
                          id="mod-login-password"
                          type="password"
                          value={loginPassword}
                          onChange={(event) => setLoginPassword(event.target.value)}
                          minLength={8}
                          maxLength={100}
                          required
                          autoComplete="current-password"
                          className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
                        />
                      </div>
                      {loginError && (
                        <p className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
                          {loginError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={isLoginSubmitting}
                        className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isLoginSubmitting ? 'Logging in...' : 'Log in'}
                      </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-stone-400">
                      No account yet?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveModal('register')}
                        className="font-medium text-green-400 hover:text-green-300 transition"
                      >
                        Create one
                      </button>
                    </p>
                  </>
                )}

                {/* ===== MODAL PROFILE ===== */}
                {activeModal === 'profile' && (
                  <>
                    {isProfileLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-stone-400">Loading profile...</p>
                      </div>
                    ) : !profileUser ? (
                      <div className="text-center">
                        <h1 className="mb-3 text-2xl font-bold text-white">Unable to load profile</h1>
                        <p className="mb-6 text-red-300">{profileError || 'User not found'}</p>
                        <button
                          type="button"
                          onClick={() => setActiveModal('login')}
                          className="inline-block rounded-lg bg-green-500 px-4 py-3 font-semibold text-stone-900 hover:bg-green-400 transition"
                        >
                          Return to login
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-8 flex items-start justify-between gap-4">
                          <div>
                            <p className="mb-2 text-sm uppercase tracking-widest text-green-400">Profile</p>
                            <h1 className="text-4xl font-bold text-white">{profileUser.username}</h1>
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={handleOpenFriends}
                              className="rounded-lg border border-green-500 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-500/10"
                            >
                              Friends
                            </button>
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-red-500 hover:text-red-300"
                            >
                              Log out
                            </button>
                          </div>
                        </div>
                        {profileError && (
                          <p className="mb-6 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
                            {profileError}
                          </p>
                        )}
                        {profileSuccess && (
                          <p className="mb-6 rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
                            {profileSuccess}
                          </p>
                        )}
                        <div className="mb-8 space-y-4">
                          <div className="rounded-xl border border-stone-700 bg-stone-950 p-4">
                            <p className="text-sm text-stone-500">User ID</p>
                            <p className="mt-1 text-lg text-white">{profileUser.id}</p>
                          </div>
                          <div className="rounded-xl border border-stone-700 bg-stone-950 p-4">
                            <p className="text-sm text-stone-500">Email</p>
                            <p className="mt-1 text-lg text-white">{profileUser.email}</p>
                          </div>
                          <div className="rounded-xl border border-stone-700 bg-stone-950 p-4">
                            <p className="mb-3 text-sm text-stone-500">Avatar</p>
                            <img
                              src={profileUser.avatarUrl ?? DEFAULT_AVATAR_URL}
                              alt={`Avatar de ${profileUser.username}`}
                              className="h-32 w-32 rounded-full object-cover mx-auto"
                            />
                          </div>
                        </div>
                        <form className="mb-8 border-t border-stone-700 pt-8" onSubmit={handleAvatarSubmit}>
                          <h2 className="mb-5 text-2xl font-semibold text-white">Change avatar</h2>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setAvatarFile(file);
                            }}
                            className="block w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-300"
                          />
                          <p className="mt-2 text-sm text-stone-500">JPEG, PNG or WebP — maximum 2 MB.</p>
                          <button
                            type="submit"
                            disabled={!avatarFile || isUploadingAvatar}
                            className="mt-6 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUploadingAvatar ? 'Uploading...' : 'Upload avatar'}
                          </button>
                        </form>
                        <form className="border-t border-stone-700 pt-8" onSubmit={handleProfileSubmit}>
                          <h2 className="mb-5 text-2xl font-semibold text-white">Edit profile</h2>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-stone-300" htmlFor="mod-profile-username">
                              Username
                            </label>
                            <input
                              id="mod-profile-username"
                              type="text"
                              value={profileUsername}
                              onChange={(event) => setProfileUsername(event.target.value)}
                              minLength={3}
                              maxLength={20}
                              required
                              autoComplete="username"
                              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-green-500"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={isProfileSubmitting || profileUsername.trim() === profileUser.username}
                            className="mt-6 w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProfileSubmitting ? 'Saving...' : 'Save changes'}
                          </button>
                        </form>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* ===== MODAL FRIENDS ===== */}
        {activeModal === 'friends' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
              onClick={closeFriendsModal}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-4xl bg-stone-900 rounded-2xl border border-stone-700 shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
                <button
                  onClick={closeFriendsModal}
                  className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl transition"
                  aria-label="Close"
                >
                  ×
                </button>

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
                  <button
                    type="button"
                    onClick={closeFriendsModal}
                    className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-green-500 hover:text-green-300"
                  >
                    Back to profile
                  </button>
                </motion.div>

                {/* Notifications */}
                <AnimatePresence mode="wait">
                  {friendsError && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300"
                    >
                      {friendsError}
                    </motion.p>
                  )}
                  {friendsSuccess && (
                    <motion.p
                      key="success"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3 text-sm text-emerald-300"
                    >
                      {friendsSuccess}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Loading */}
                {friendsLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center py-12"
                  >
                    <p className="text-stone-400">Loading friends...</p>
                  </motion.div>
                )}

                {!friendsLoading && (
                  <>
                    {/* Received Requests */}
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="mb-10 rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-xl"
                    >
                      <h2 className="mb-5 text-2xl font-semibold text-white">Received requests</h2>
                      {friendRequests.length === 0 ? (
                        <p className="text-sm text-stone-400">No pending friend requests.</p>
                      ) : (
                        <motion.div layout className="space-y-3">
                          {friendRequests.map((request) => (
                            <motion.div
                              key={request.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-950 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={request.requester.avatarUrl ?? DEFAULT_AVATAR_URL}
                                  alt={`Avatar de ${request.requester.username}`}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                                <div>
                                  <p className="font-medium text-white">{request.requester.username}</p>
                                  <p className="text-xs text-stone-500">Wants to be your friend</p>
                                </div>
                              </div>
                              <motion.button
                                type="button"
                                onClick={() => void handleAcceptFriendRequest(request.requester.id)}
                                disabled={actionLoadingUserId === request.requester.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoadingUserId === request.requester.id ? 'Loading...' : 'Accept'}
                              </motion.button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.section>

                    {/* My Friends */}
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="mb-10 rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-xl"
                    >
                      <h2 className="mb-5 text-2xl font-semibold text-white">My friends</h2>
                      {friends.length === 0 ? (
                        <p className="text-sm text-stone-400">You have no friends yet.</p>
                      ) : (
                        <motion.div layout className="space-y-3">
                          {friends.map((friendship) => (
                            <motion.div
                              key={friendship.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-950 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <CharacterPortrait character={friendship.friend.username} size="sm" />
                                <div>
                                  <p className="font-medium text-white">{friendship.friend.username}</p>
                                  <p className={`flex items-center gap-2 text-xs ${friendship.friend.isOnline ? 'text-green-300' : 'text-stone-500'}`}>
                                    <span className={`h-2 w-2 rounded-full ${friendship.friend.isOnline ? 'bg-green-400 shadow-[0_0_8px_#3ecf8e]' : 'bg-stone-600'}`} />
                                    {friendship.friend.isOnline ? 'Online' : formatLastSeen(friendship.friend.lastSeenAt)}
                                  </p>
                                </div>
                              </div>
                              <motion.button
                                type="button"
                                onClick={() => void handleRemoveFriend(friendship.friend.id)}
                                disabled={actionLoadingUserId === friendship.friend.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoadingUserId === friendship.friend.id ? 'Loading...' : 'Remove'}
                              </motion.button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.section>

                    {/* Find Users */}
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-xl"
                    >
                      <h2 className="mb-5 text-2xl font-semibold text-white">Find users</h2>
                      {availableUsers.length === 0 ? (
                        <p className="text-sm text-stone-400">No available users to add right now.</p>
                      ) : (
                        <motion.div layout className="space-y-3">
                          {availableUsers.map((user) => (
                            <motion.div
                              key={user.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-950 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <CharacterPortrait character={user.username} size="sm" />
                                <div>
                                  <p className="font-medium text-white">{user.username}</p>
                                  <p className="text-xs text-stone-500">User</p>
                                </div>
                              </div>
                              <motion.button
                                type="button"
                                onClick={() => void handleSendFriendRequest(user.id)}
                                disabled={actionLoadingUserId === user.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoadingUserId === user.id ? 'Loading...' : 'Add friend'}
                              </motion.button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.section>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
