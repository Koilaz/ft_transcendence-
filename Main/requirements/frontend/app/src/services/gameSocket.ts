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
  | GameAgentsDownMessage
  | GameAssignmentMessage
  | GameYourTurnMessage
  | GameTurnMessage
  | GameChatMessage
  | GameRoundStateMessage
  | GameSilenceMessage
  | GameVoteRegisteredMessage
  | GameRoundTransitionMessage
  | GameEndMessage
  | GameRoomClosedMessage;

export type GameMessageHandler = (
  message: GameMessage,
) => void;

function getGameWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  return `${protocol}://${window.location.host}/ws/game`;
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
        message.type !== 'agentsDown' &&
        message.type !== 'assignment' &&
        message.type !== 'yourTurn' &&
        message.type !== 'turn' &&
        message.type !== 'chat' &&
        message.type !== 'roundState' &&
        message.type !== 'silence' &&
        message.type !== 'voteRegistered' &&
        message.type !== 'roundTransition' &&
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
