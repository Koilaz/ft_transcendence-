// Types pour la partie Game

export type FeedMessage = 
  | { id: string; kind: 'chat'; sender: string; text: string }
  | { id: string; kind: 'system'; text: string };

export type GameUIState = {
  myCharacter: string | null;
  roomNumber: number | null;
  roomStatus: string | null;
  roundPhase: string | null;
  currentTurnCharacter: string | null;
  turnOrder: string[];
  turnCycle: number | null;
  countdown: number | null;
  messages: FeedMessage[];
};

export type LocalConnectionAction = { type: 'connection'; text: string };

export type GameMessage = 
  | { type: 'state'; status: string; room_number: number; countdown: number }
  | { type: 'assignment'; character: string }
  | { type: 'yourTurn'; countdown: number }
  | { type: 'turn'; character: string; turnOrder: string[]; turnCycle: number; countdown: number }
  | { type: 'chat'; sender: string; text: string }
  | { type: 'roundState'; status: string }
  | { type: 'silence'; character: string };

export type GameAction = GameMessage | LocalConnectionAction;

export type BannerVariant = 'waiting' | 'myturn' | 'voting' | 'info';

export type Banner = { text: string; variant: BannerVariant };

export type InputState = { enabled: boolean; placeholder: string; myTurn: boolean };

export type ConnectionStatus = 'open' | 'closed' | 'connecting';

export type Player = {
  name: string;
  isMe: boolean;
  isCurrentTurn: boolean;
};
