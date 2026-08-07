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

export type GameMessage =
  | GameStateMessage
  | GameAssignmentMessage
  | GameYourTurnMessage
  | GameTurnMessage
  | GameChatMessage
  | GameRoundStateMessage
  | GameSilenceMessage;

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
        message.type !== 'assignment' &&
        message.type !== 'yourTurn' &&
        message.type !== 'turn' &&
        message.type !== 'chat' &&
        message.type !== 'roundState' &&
        message.type !== 'silence'
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
