// Un agent dont aucune manche n'est jouable : le serveur l'ecarte de la partie
// et l'explique ici, pour l'ecran d'attente (voir agents/index_agent.js).
export type AgentStatus = {
  name: string;
  reason: string;
  detail?: string;
};

export type GameStateMessage = {
  type: 'state';
  room_number: number | null;
  status: string;
  countdown: number | null;
  players: number;
  // Champs de la file d'attente uniquement (voir game/queue.js :
  // broadcastQueue). La room diffuse le meme 'state' sans ces champs.
  min_players?: number;
  ready_players?: number;
  ready?: boolean;
  // Champs de la room uniquement : la manche en cours et le total, remplaces
  // par le calcul local qu'on faisait avant avec un nombre de manches en dur.
  current_manche?: number;
  max_manches?: number;
};

export type GameDebriefWaitMessage = {
  type: 'debriefWait';
  attempt: number;
  max: number;
};

// Jeton de reprise : envoye a chaque connexion. Le garder (sessionStorage,
// par onglet) permet de reprendre sa place apres un refresh ou une coupure.
export type GameSessionMessage = {
  type: 'session';
  token: string;
};

// L'instantane de reprise : remplace l'etat du navigateur en bloc (voir
// room.js : reconnectPlayer). L'historique arrive sans isAI — le serveur le
// retire exprès pour ne pas révéler l'imposteur.
export type GameReconnectedMessage = {
  type: 'reconnected';
  state: {
    status: string;
    players: number;
    room_number: number;
    countdown: number | null;
    current_manche?: number;
    max_manches?: number;
  };
  character: string;
  history: { sender: string; text: string }[];
  turn: {
    character: string;
    turnOrder: string[];
    turnCycle: number;
    totalTurns: number;
    countdown: number;
  } | null;
  roundPhase: string;
  hasVoted: boolean;
  debriefWaiting: boolean;
  // Absents suivis en direct : place reservee (temporaire) ou depart definitif
  // (voir room.js : reconnectPlayer).
  disconnectedCharacters: string[];
  leftCharacters: string[];
};

// Un joueur vient de perdre la liaison : sa place reste reservee jusqu'a la
// fin de la manche (temporary). Le message n'est affiche que dans le fil de chat.
export type GamePlayerDisconnectedMessage = {
  type: 'playerDisconnected';
  character: string;
  temporary: boolean;
};

export type GamePlayerReconnectedMessage = {
  type: 'playerReconnected';
  character: string;
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
  totalTurns: number;
  countdown: number;
};

export type GameChatMessage = {
  type: 'chat';
  sender: string;
  text: string;
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

export type FinalRank = {
  playerId: string;
  name: string;
  score: number;
  isAI: boolean;
};

export type GameRoundTransitionMessage = {
  type: 'roundTransition';
  results: RoundResult[];
  aiCharacter: string;
};

// Le bot ne repond plus : la manche s'arrete sans points, le temps que le
// serveur reverifie les agents (voir room.js : cancelRound).
export type GameRoundCancelledMessage = {
  type: 'roundCancelled';
};

export type GameEndMessage = {
  type: 'gameEnd';
  winnerId: string;
  ranking: FinalRank[];
  history: { sender: string; text: string; isAI: boolean }[];
};

export type GameRoomClosedMessage = {
  type: 'roomClosed';
  code: string;
};

export type GameMessage =
  | GameStateMessage
  | GameDebriefWaitMessage
  | GameSessionMessage
  | GameReconnectedMessage
  | GamePlayerDisconnectedMessage
  | GamePlayerReconnectedMessage
  | GameAgentsDownMessage
  | GameAssignmentMessage
  | GameYourTurnMessage
  | GameTurnMessage
  | GameChatMessage
  | GameSilenceMessage
  | GameVoteRegisteredMessage
  | GameRoundTransitionMessage
  | GameRoundCancelledMessage
  | GameEndMessage
  | GameRoomClosedMessage;

export type GameMessageHandler = (
  message: GameMessage,
) => void;

export const RESUME_TOKEN_STORAGE_KEY = 'gameResumeToken';

// Une room fermee rend le jeton de reprise inutile — sa room est morte. Le
// conserver ferait « voler » la session d'un autre onglet au prochain essai :
// apres un remplacement d'onglet, chaque reprise chasserait l'autre en boucle.
export function discardResumeToken(): void {
  sessionStorage.removeItem(RESUME_TOKEN_STORAGE_KEY);
}

// Health check : vérifie que le service game répond avant de tenter le
// WebSocket. Un fetch sur /ws/game en HTTP retourne 204 si le service est
// up (route Express dédiée), 502 si nginx ne trouve pas le backend (down).
// Le 204 garde la console propre : un 404 y serait logué en rouge
// (« Failed to load resource ») à chaque chargement de la page.
export async function waitForGameServer(
  signal: AbortSignal,
  maxAttempts = 30,
  delayMs = 1000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (signal.aborted) return false;
    try {
      const response = await fetch('/ws/game', { method: 'HEAD', signal });
      if (response.status !== 502) return true;
    } catch {
      // 502 ou erreur réseau → on réessaie
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function getGameWebSocketUrl(): string {
  // Auto-détection du protocole : wss:// si la page est en HTTPS, ws:// sinon
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  // Le serveur identifie le joueur à la connexion (voir gameConnections.js) :
  // le JWT d'un compte donne displayName = username, sinon le pseudo d'invite.
  // Sans rien, le classement final affiche « joueur-N ».
  const params = new URLSearchParams();
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken)
    params.set('token', accessToken);
  //const guestName = localStorage.getItem('guestName');
  //if (guestName)
    //params.set('name', guestName);
  const guestName = localStorage.getItem('guestName');
  if (guestName)
    params.set('name', guestName);
  const resumeToken = sessionStorage.getItem(RESUME_TOKEN_STORAGE_KEY);
  if (resumeToken)
    params.set('resumeToken', resumeToken);
  const query = params.toString();

  // URL absolue basée sur l'hôte courant (passera par nginx qui proxyfie)
  return `${protocol}://${window.location.host}/ws/game${query ? `?${query}` : ''}`;
}

export function connectGameSocket(
  onMessage: GameMessageHandler,
): WebSocket {
  const socket = new WebSocket(getGameWebSocketUrl());

  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data) as GameMessage;

      if (
        message.type !== 'state' &&
        message.type !== 'debriefWait' &&
        message.type !== 'session' &&
        message.type !== 'reconnected' &&
        message.type !== 'playerDisconnected' &&
        message.type !== 'playerReconnected' &&
        message.type !== 'agentsDown' &&
        message.type !== 'assignment' &&
        message.type !== 'yourTurn' &&
        message.type !== 'turn' &&
        message.type !== 'chat' &&
        message.type !== 'silence' &&
        message.type !== 'voteRegistered' &&
        message.type !== 'roundTransition' &&
        message.type !== 'roundCancelled' &&
        message.type !== 'gameEnd' &&
        message.type !== 'roomClosed'
      ) {
        return;
      }

      onMessage(message);
    } catch {
      // Message invalide : on ignore.
    }
  });

  return socket;
}

// Seuls messages que le client envoie au serveur : pas de "join"/"quickplay",
// le serveur assigne le joueur a une room des l'ouverture de la connexion.
export type GameChatOutgoingMessage = {
  type: 'chat';
  text: string;
};

export function sendChatMessage(socket: WebSocket, text: string): void {
  const message: GameChatOutgoingMessage = { type: 'chat', text };

  socket.send(JSON.stringify(message));
}

// Le vote est collecte en temps reel pendant la phase de discussion (voir
// round.js : onPlayerVote n'accepte que status === 'chatting').
export type GameVoteOutgoingMessage = {
  type: 'vote';
  targetCharacter: string;
};

export function sendVoteMessage(socket: WebSocket, targetCharacter: string): void {
  const message: GameVoteOutgoingMessage = { type: 'vote', targetCharacter };

  socket.send(JSON.stringify(message));
}

// « Prêt » : confirme a la file d'attente que le joueur accepte de lancer la
// partie. Sans ce message de chaque joueur present, aucune room ne s'ouvre
// (voir game/queue.js : ready).
export function sendReadyMessage(socket: WebSocket): void {
  socket.send(JSON.stringify({ type: 'ready' }));
}

// « Rejouer » : remet le joueur dans la file d'attente. Le serveur ne
// l'accepte qu'une fois la room fermee (voir server.js).
export function sendReplayMessage(socket: WebSocket): void {
  socket.send(JSON.stringify({ type: 'replay' }));
}
