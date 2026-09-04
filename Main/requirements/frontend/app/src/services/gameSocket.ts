export type GameStateMessage = {
  type: 'state';
  room_number: number;
  status: string;
  countdown: number | null;
  players: number;
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
  score: number;
  isAI?: boolean;
};

export type GameGameEndMessage = {
  type: 'gameEnd';
  ranking: FinalRank[];
  winnerId: string;
};

export type GameMessage =
  | GameStateMessage
  | GameAssignmentMessage
  | GameYourTurnMessage
  | GameTurnMessage
  | GameChatMessage
  | GameRoundStateMessage
  | GameVoteRegisteredMessage // ajout
  | GameRoundEndMessage
  | GameGameEndMessage
  | GameSilenceMessage;

export type GameMessageHandler = (
  message: GameMessage,
) => void;

export type GameVoteOutgoingMessage = {
  type: 'vote';
  targetCharacter: string;
};

export function sendVoteMessage(socket: WebSocket, targetCharacter: string): void {
  const message: GameVoteOutgoingMessage = { type: 'vote', targetCharacter };
  socket.send(JSON.stringify(message));
}

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
        message.type !== 'assignment' &&
        message.type !== 'yourTurn' &&
        message.type !== 'turn' &&
        message.type !== 'chat' &&
        message.type !== 'roundState' &&
        message.type !== 'silence' &&
        message.type !== 'voteRegistered' && 
        message.type !== 'roundEnd' &&
        message.type !== 'gameEnd'
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
