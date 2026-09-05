export type GameStateMessage = {
  type: 'state';
  // null tant que le joueur patiente dans la file : aucune room n'existe encore
  room_number: number | null;
  status: string;
  countdown: number | null;
  players: number;
};

// La room ferme definitivement. `code` est une chaine machine : c'est le front
// qui choisit le texte et la langue.
export type GameRoomClosedMessage = {
  type: 'roomClosed';
  code: 'game_finished' | 'not_enough_players' | 'empty_room' | string;
};

// Un joueur a quitte la partie. Toujours par nom de personnage, jamais par
// identifiant : le protocole ne diffuse aucun playerId en cours de partie.
export type GamePlayerDisconnectedMessage = {
  type: 'playerDisconnected';
  character: string;
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
  | GameRoomClosedMessage
  | GamePlayerDisconnectedMessage
  | GameAgentsDownMessage
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
  // Pseudo purement decoratif : il n'apparait qu'au classement final. Le
  // serveur le tronque et le nettoie, on ne lui fait pas confiance non plus.
  const name = localStorage.getItem('guestName');
  const query = name ? `?name=${encodeURIComponent(name)}` : '';

  return `${protocol}://${window.location.host}/ws/game${query}`;
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
        message.type !== 'gameEnd' &&
        message.type !== 'roomClosed' &&
        message.type !== 'playerDisconnected' &&
        message.type !== 'agentsDown'
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

// Remet le joueur dans la file d'attente, a son initiative. Sans ce message il
// reste sur l'ecran de resultats : le serveur ne relance jamais personne tout
// seul, pour ne pas catapulter le joueur dans une partie qu'il n'a pas demandee.
export function sendReplayMessage(socket: WebSocket): void {
  socket.send(JSON.stringify({ type: 'replay' }));
}
