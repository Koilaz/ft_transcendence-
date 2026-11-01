// Types pour la partie Game

// GameMessage (le protocole complet, vue reseau) est declare UNE seule
// fois, dans services/gameSocket.ts — le reducer le consomme tel quel via
// GameAction. L'ancienne redeclaration ici avait deja derive de la version
// socket (max_message_length ajoute d'un seul cote le 01/11) : une seule
// source elimine la question.
import type { RoundResult, FinalRank, AgentStatus, GameMessage } from '../services/gameSocket';

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
  // Limite de longueur des messages, depuis le 'state' (queue et room) :
  // la config serveur fait foi (config.js maxMessageLength), le front n'a
  // plus de 150 code en dur — le ChatInput en fait son maxLength.
  maxMessageLength: number;
  // L'agent d'analyse tarde : le serveur prolonge le scoreboard (debriefWait).
  debriefWait: { attempt: number; max: number } | null;
  // Vote deja depose cette manche : restaure par l'instantane de reprise.
  hasVoted: boolean;
  // Personnage pour qui on a vote cette manche : pilote le badge vert, lui
  // aussi restaure par l'instantane de reprise (refresh) et remis a zero a
  // chaque nouvelle manche (assignment).
  votedFor: string | null;
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

export type GameAction = GameMessage | LocalConnectionAction;

export type BannerVariant = 'waiting' | 'myturn' | 'voting' | 'info';

export type Banner = { text: string; variant: BannerVariant };

export type InputState = { enabled: boolean; placeholder: string; myTurn: boolean };

export type ConnectionStatus = 'open' | 'closed' | 'connecting';
