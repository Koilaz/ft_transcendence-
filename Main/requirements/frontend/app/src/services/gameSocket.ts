export type GameStateMessage = {
  type: 'state';
  // null tant que le joueur patiente dans la file : aucune room n'existe encore
  room_number: number | null;
  status: string;
  countdown: number | null;
  players: number;
  min_players?: number;
  ready_players?: number;
  ready?: boolean;
  current_manche?:number;
  max_manches?: number
};

// La room ferme definitivement. `code` est une chaine machine : c'est le front
// qui choisit le texte et la langue.
export type GameRoomClosedMessage = {
  type: 'roomClosed';
  code: 'game_finished' | 'not_enough_players' | 'empty_room' | string;
};

// Un joueur est absent temporairement ou a quitte la partie. Le protocole
// n'utilise que son personnage et ne diffuse aucun playerId en cours de partie.
export type GamePlayerDisconnectedMessage = {
  type: 'playerDisconnected';
  character: string;
  temporary?: boolean;
};

export type GameReconnectedMessage = {
  type: 'reconnected';
  state: GameStateMessage;
  character: string;
  history: { sender: string; text: string }[];
  turn: GameTurnMessage | null;
  roundPhase: string;
  hasVoted: boolean;
  disconnectedCharacters: string[];
  leftCharacters: string[];
  debriefWaiting: boolean;
};

// Envoye des la connexion quand un agent de game/config.js n'a pas passe le
// healthcheck au demarrage du serveur : ces bots-la ne parleront pas. `reason`
// est une chaine machine, c'est le front qui choisit le texte ; `detail` est le
// motif technique brut, pour celui qui doit le reparer.
export type AgentStatus = {
  name: string;
  reason: string;
  detail: string;
};

// envoyer quand entre chaque manche

export type GameRoundTransitionMessage = {
  type: 'roundTransition';
}

// L'IA analyse la manche qui vient de finir et n'a pas encore rendu sa copie :
// le tableau des scores est prolonge d'un tour de compte a rebours. `attempt` et
// `max` disent ou l'on en est dans les prolongations accordees ; le texte, lui,
// est choisi par le front.
export type GameDebriefWaitMessage = {
  type: 'debriefWait';
  attempt: number;
  max: number;
};

export type GameAgentsDownMessage = {
  type: 'agentsDown';
  agents: AgentStatus[];
};

export type GameAssignmentMessage = {
  type: 'assignment';
  character: string;
};

export type GameYourTurnMessage = {
  type: 'yourTurn';
  countdown: number;
};

export type GameTurnMessage = {
  type: 'turn';
  character: string;
  turnOrder: string[];
  turnCycle: number;
  countdown: number;
  totalTurns: number;
};

export type GameChatMessage = {
  type: 'chat';
  sender: string;
  text: string;
};

export type GameRoundStateMessage = {
  type: 'roundState';
  status: string;
};

export type GameSilenceMessage = {
  type: 'silence';
  character: string;
};

export type GameVoteRegisteredMessage = {
  type: 'voteRegistered';
};

export type RoundResult = {
  playerId: string;
  character: string;
  target: string | null;
  score: number;
  isCorrect: boolean;
  isAI: boolean;
};

export type GameRoundEndMessage = {
  type: 'roundEnd';
  aiCharacter: string;
  results: RoundResult[];
};

export type FinalRank = {
  playerId: string;
  // Nom lisible : pseudo du joueur, ou « L'AImpostor » pour l'agent. La partie
  // etant terminee, reveler qui est qui ne trahit plus rien.
  name: string;
  score: number;
  isAI?: boolean;
};

export type ChatHistoryItem = {
  sender: string;
  text: string;
  isAI: boolean;
};

export type GameGameEndMessage = {
  type: 'gameEnd';
  ranking: FinalRank[];
  winnerId: string;
  history: ChatHistoryItem[];
};

export type GameMessage =
  | GameStateMessage
  | { type: 'session'; token: string }
  | GameReconnectedMessage
  | { type: 'playerReconnected'; character: string }
  | GameAssignmentMessage
  | GameYourTurnMessage
  | GameTurnMessage
  | GameChatMessage
  | GameRoundStateMessage
  | GameVoteRegisteredMessage // ajout
  | GameRoundEndMessage
  | GameGameEndMessage
  | GameRoomClosedMessage
  | GamePlayerDisconnectedMessage
  | GameAgentsDownMessage
  | GameRoundTransitionMessage
  | GameDebriefWaitMessage
  | GameSilenceMessage;

export type GameMessageHandler = (
  message: GameMessage,
) => void;

export type GameVoteOutgoingMessage = {
  type: 'vote';
  targetCharacter: string;
};

export function sendReadyMessage(socket: WebSocket): void {
  socket.send(JSON.stringify({ type: 'ready' }));
}

export function sendVoteMessage(socket: WebSocket, targetCharacter: string): void {
  const message: GameVoteOutgoingMessage = { type: 'vote', targetCharacter };
  socket.send(JSON.stringify(message));
}

const RESUME_TOKEN_KEY = 'gameResumeToken';
const CLOSED_ROOM_KEY = 'gameClosedCode';

export function getClosedGameCode(): string | null {
  return sessionStorage.getItem(CLOSED_ROOM_KEY);
}

export function getInitialConnectionStatus(): GameConnectionStatus {
  if (getClosedGameCode()) return 'closed';
  return sessionStorage.getItem(RESUME_TOKEN_KEY) ? 'reconnecting' : 'connecting';
}

function getGameWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Connecte : le serveur verifie le token et prend le pseudo du compte. Le
  // header Authorization est impossible sur une WebSocket, d'ou l'URL.
  // Invite : pseudo purement decoratif, que le serveur tronque et nettoie.
  const token = localStorage.getItem('accessToken');
  const name = localStorage.getItem('guestName');
  const params = new URLSearchParams();
  const resumeToken = sessionStorage.getItem(RESUME_TOKEN_KEY);

  if (resumeToken) params.set('resumeToken', resumeToken);

  if (token) {
    params.set('token', token);
  } else if (name) {
    params.set('name', name);
  }

  const query = params.toString();

  return `${protocol}://${window.location.host}/ws/game${query ? `?${query}` : ''}`;
}

export type GameConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed';

export type GameConnection = {
  getSocket: () => WebSocket | null;
  replay: () => void;
  dispose: () => void;
};

// Le jeton reste propre a cet onglet. Une fermeture de salle est aussi gardee
// en memoire : recharger les resultats ne doit jamais lancer une autre partie.
export function connectGameSocket(
  onMessage: GameMessageHandler,
  onStatus: (status: GameConnectionStatus) => void,
): GameConnection {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let handshakeTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let pageHidden = false;
  let terminal = getClosedGameCode() !== null;
  let failures = 0;

  function clearTimers() {
    clearTimeout(retryTimer);
    clearTimeout(handshakeTimer);
    retryTimer = undefined;
    handshakeTimer = undefined;
  }

  function closeRoom(code: string) {
    terminal = true;
    clearTimers();
    sessionStorage.removeItem(RESUME_TOKEN_KEY);
    sessionStorage.setItem(CLOSED_ROOM_KEY, code);
  }

  function scheduleRetry() {
    if (disposed || terminal || pageHidden || retryTimer !== undefined) return;
    onStatus('reconnecting');
    const delay = Math.min(500 * 2 ** Math.min(failures++, 4), 5000);
    retryTimer = setTimeout(connect, delay);
  }

  function waitForState(current: WebSocket) {
    clearTimeout(handshakeTimer);
    // Couvre une negotiation bloquee et un replay envoye sur une socket que
    // le navigateur croit encore ouverte apres une coupure reseau.
    handshakeTimer = setTimeout(() => {
      if (disposed || socket !== current) return;
      socket = null;
      current.close();
      scheduleRetry();
    }, 10000);
  }

  function connect() {
    retryTimer = undefined;
    if (disposed || terminal || pageHidden) return;

    const current = new WebSocket(getGameWebSocketUrl());
    socket = current;
    const isCurrent = () => !disposed && socket === current;
    waitForState(current);

    current.addEventListener('message', (event) => {
      if (!isCurrent()) return;
      let message: GameMessage;
      try {
        message = JSON.parse(event.data) as GameMessage;
      } catch {
        return;
      }
      if (!message || typeof message.type !== 'string') return;

      if (message.type === 'session') {
        if (!terminal && typeof message.token === 'string') {
          sessionStorage.setItem(RESUME_TOKEN_KEY, message.token);
        }
        return;
      }
      if (message.type === 'gameEnd') closeRoom('game_finished');
      if (message.type === 'roomClosed') closeRoom(message.code);
      if (message.type === 'state' || message.type === 'reconnected' || message.type === 'roomClosed') {
        clearTimeout(handshakeTimer);
        handshakeTimer = undefined;
        failures = 0;
        onStatus('connected');
      }
      onMessage(message);
    });

    current.addEventListener('close', (event) => {
      if (!isCurrent()) return;
      socket = null;
      clearTimeout(handshakeTimer);
      handshakeTimer = undefined;
      if (event.code === 4001) {
        closeRoom('session_replaced');
        onMessage({ type: 'roomClosed', code: 'session_replaced' });
      }
      if (terminal) onStatus('closed');
      else scheduleRetry();
    });

    current.addEventListener('error', () => {
      if (!isCurrent()) return;
      // Le close suit normalement error. Detacher immediatement cette socket
      // couvre aussi les navigateurs qui tardent a emettre cet evenement.
      socket = null;
      clearTimeout(handshakeTimer);
      handshakeTimer = undefined;
      current.close();
      if (terminal) onStatus('closed');
      else scheduleRetry();
    });
  }

  function reconnectOnReturn() {
    if (disposed || terminal || pageHidden || socket?.readyState === WebSocket.OPEN) return;
    clearTimers();
    const previous = socket;
    socket = null;
    previous?.close();
    connect();
  }

  function pauseConnection(event: Event) {
    if (disposed || terminal) return;
    if (event.type === 'pagehide') pageHidden = true;
    clearTimers();
    const previous = socket;
    socket = null;
    previous?.close();
    onStatus('reconnecting');
    scheduleRetry();
  }

  function showPage() {
    pageHidden = false;
    reconnectOnReturn();
  }

  window.addEventListener('online', reconnectOnReturn);
  window.addEventListener('pageshow', showPage);
  window.addEventListener('offline', pauseConnection);
  window.addEventListener('pagehide', pauseConnection);
  // Reporter l'ouverture evite une connexion fantome pendant le double
  // montage/cleanup de React StrictMode.
  if (!terminal) retryTimer = setTimeout(connect, 0);

  return {
    getSocket: () => socket?.readyState === WebSocket.OPEN ? socket : null,
    replay: () => {
      const liveSocket = socket?.readyState === WebSocket.OPEN ? socket : null;
      terminal = false;
      failures = 0;
      sessionStorage.removeItem(CLOSED_ROOM_KEY);
      sessionStorage.removeItem(RESUME_TOKEN_KEY);
      clearTimers();
      onStatus('connecting');
      if (liveSocket) {
        waitForState(liveSocket);
        sendReplayMessage(liveSocket);
      }
      else connect();
    },
    dispose: () => {
      disposed = true;
      clearTimers();
      window.removeEventListener('online', reconnectOnReturn);
      window.removeEventListener('pageshow', showPage);
      window.removeEventListener('offline', pauseConnection);
      window.removeEventListener('pagehide', pauseConnection);
      const previous = socket;
      socket = null;
      previous?.close();
    },
  };
}

// Seul message que le client envoie au serveur : pas de "join"/"quickplay",
// le serveur assigne le joueur a une room des l'ouverture de la connexion.
export type GameChatOutgoingMessage = {
  type: 'chat';
  text: string;
};

export function sendChatMessage(socket: WebSocket, text: string): void {
  const message: GameChatOutgoingMessage = { type: 'chat', text };

  socket.send(JSON.stringify(message));
}

// Remet le joueur dans la file d'attente, a son initiative. Sans ce message il
// reste sur l'ecran de resultats : le serveur ne relance jamais personne tout
// seul, pour ne pas catapulter le joueur dans une partie qu'il n'a pas demandee.
export function sendReplayMessage(socket: WebSocket): void {
  socket.send(JSON.stringify({ type: 'replay' }));
}
