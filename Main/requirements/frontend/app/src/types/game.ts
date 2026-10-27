// Types pour la partie Game

import type { RoundResult, FinalRank, AgentStatus } from '../services/gameSocket';

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
  // Nombre total de tours par manche, envoye par le serveur (round.js :
  // publicTurn). La config serveur fait foi, plus de total code en dur.
  totalTurns: number;
  countdown: number | null;
  // File d'attente : peuples par le 'state' de la queue, remis a zero au reset.
  waitingPlayers: number;
  minPlayers: number;
  readyPlayers: number;
  isReady: boolean;
  agentsDown: AgentStatus[];
  // Manche en cours, depuis le 'state' de la room : la config serveur fait foi,
  // plus de total de manches code en dur dans le front.
  currentManche: number | null;
  maxManches: number | null;
  // L'agent d'analyse tarde : le serveur prolonge le scoreboard (debriefWait).
  debriefWait: { attempt: number; max: number } | null;
  // Vote deja depose cette manche : restaure par l'instantane de reprise.
  hasVoted: boolean;
  // Absents suivis en direct : place reservee (temporaire) ou depart definitif.
  // Peuples par l'instantane de reprise, tenus a jour par playerDisconnected
  // et playerReconnected.
  disconnectedCharacters: string[];
  leftCharacters: string[];
  messages: FeedMessage[];
  roundResults: RoundResult[] | null;
  aiCharacter: string | null;
  endGameData: {
    winnerId: string;
    ranking: FinalRank[];
    history: { sender: string; text: string; isAI: boolean }[];
  } | null;
  roomClosedCode: string | null;
};

export type LocalConnectionAction =
  | { type: 'connection'; text: string }
  | { type: 'resetGame' };

export type GameMessage = 
  | { type: 'state'; status: string; room_number: number | null; countdown: number | null; players?: number; min_players?: number; ready_players?: number; ready?: boolean; current_manche?: number; max_manches?: number }
  | { type: 'debriefWait'; attempt: number; max: number }
  | { type: 'session'; token: string }
  | { type: 'reconnected'; state: { status: string; players: number; room_number: number; countdown: number | null; current_manche?: number; max_manches?: number }; character: string; history: { sender: string; text: string }[]; turn: { character: string; turnOrder: string[]; turnCycle: number; totalTurns: number; countdown: number } | null; roundPhase: string; hasVoted: boolean; debriefWaiting: boolean; disconnectedCharacters: string[]; leftCharacters: string[] }
  | { type: 'playerDisconnected'; character: string; temporary: boolean }
  | { type: 'playerReconnected'; character: string }
  | { type: 'agentsDown'; agents: AgentStatus[] }
  | { type: 'assignment'; character: string }
  | { type: 'yourTurn'; countdown: number }
  | { type: 'turn'; character: string; turnOrder: string[]; turnCycle: number; totalTurns: number; countdown: number }
  | { type: 'chat'; sender: string; text: string }
  | { type: 'silence'; character: string }
  | { type: 'voteRegistered' }
  | { type: 'roundTransition'; results: RoundResult[]; aiCharacter: string }
  | { type: 'roundCancelled' }
  | { type: 'gameEnd'; winnerId: string; ranking: FinalRank[]; history: { sender: string; text: string; isAI: boolean }[] }
  | { type: 'roomClosed'; code: string };

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
