// Etat pur de la partie : reducer et calculs derives, sans React. Ce module
// est importe tel quel par les tests (node --test, transpilation a la volee) :
// tout ce qui touche au DOM, aux sockets ou au cycle de vie du composant
// reste dans hooks/useGame.ts.
import type {
  GameUIState,
  GameAction,
  Banner,
  InputState,
  ConnectionStatus,
} from '../types/game';

export const initialState: GameUIState = {
  myCharacter: null,
  roomNumber: null,
  roomStatus: null,
  roundPhase: null,
  currentTurnCharacter: null,
  turnOrder: [],
  turnCycle: null,
  totalTurns: 4,
  countdown: null,
  waitingPlayers: 0,
  minPlayers: 0,
  readyPlayers: 0,
  isReady: false,
  agentsDown: [],
  // Valeur de repli avant le premier 'state' serveur : la vraie limite arrive
  // avec le message state (queue ou room), cf. config.js maxMessageLength.
  maxMessageLength: 150,
  currentManche: null,
  maxManches: null,
  debriefWait: null,
  hasVoted: false,
  votedFor: null,
  messages: [],
  roundResults: null,
  aiCharacter: null,
  endGameData: null,
  roomClosedCode: null,
};

let messageIdCounter = 0;
function nextMessageId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

function isPlayingStatus(status: string | null): boolean {
  return (status ?? '').toLowerCase() === 'playing';
}

function isChattingPhase(roomStatus: string | null, roundPhase: string | null): boolean {
  if (roundPhase === 'voting') return false;
  return isPlayingStatus(roomStatus);
}

export function gameReducer(state: GameUIState, action: GameAction): GameUIState {
  switch (action.type) {
    case 'connection':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextMessageId(), kind: 'system', text: action.text },
        ],
      };
    case 'state': {
      const playing = isPlayingStatus(action.status);
      return {
        ...state,
        roomNumber: action.room_number,
        roomStatus: action.status,
        // Les champs de la file ne sont presents que dans le 'state' de la
        // queue : on garde les valeurs precedentes sinon.
        waitingPlayers: action.players ?? state.waitingPlayers,
        minPlayers: action.min_players ?? state.minPlayers,
        readyPlayers: action.ready_players ?? state.readyPlayers,
        isReady: action.ready ?? state.isReady,
        currentManche: action.current_manche ?? state.currentManche,
        maxManches: action.max_manches ?? state.maxManches,
        maxMessageLength: action.max_message_length ?? state.maxMessageLength,
        ...(playing ? {} : {
          currentTurnCharacter: null,
          turnOrder: [],
          countdown: action.countdown,
        }),
      };
    }
    case 'agentsDown':
      return { ...state, agentsDown: action.agents };
    case 'debriefWait':
      return {
        ...state,
        debriefWait: { attempt: action.attempt, max: action.max },
      };
    case 'assignment':
      return {
        ...state,
        myCharacter: action.character,
        roundResults: null,
        aiCharacter: null,
        debriefWait: null,
        hasVoted: false,
        votedFor: null,
        messages: [
          { id: nextMessageId(), kind: 'system', text: `>>> nouvelle manche, tu incarnes ${action.character}` },
        ],
      };
    case 'yourTurn':
      return {
        ...state,
        currentTurnCharacter: state.myCharacter,
        roundPhase: 'chatting',
        countdown: action.countdown,
      };
    case 'turn':
      return {
        ...state,
        currentTurnCharacter: action.character,
        turnOrder: action.turnOrder,
        turnCycle: action.turnCycle,
        totalTurns: action.totalTurns,
        roundPhase: 'chatting',
        countdown: action.countdown,
      };
    case 'chat':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextMessageId(), kind: 'chat', sender: action.sender, text: action.text },
        ],
      };
    case 'silence':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextMessageId(), kind: 'chat', sender: action.character, text: '...' },
        ],
      };
    case 'voteRegistered':
      return {
        ...state,
        hasVoted: true,
        votedFor: action.target,
        messages: [
          ...state.messages,
          { id: nextMessageId(), kind: 'system', text: '>>> ton vote est enregistré' },
        ],
      };
    case 'reconnected': {
      // Un seul instantane remplace l'etat du navigateur (voir room.js :
      // reconnectPlayer). L'historique n'apporte que le chat : le serveur en
      // retire isAI et les lignes « Systeme », pour ne rien révéler.
      const turn = action.turn;
      return {
        ...state,
        myCharacter: action.character,
        roomNumber: action.state.room_number,
        roomStatus: action.state.status,
        roundPhase: action.roundPhase,
        currentTurnCharacter: turn ? turn.character : null,
        turnOrder: turn ? turn.turnOrder : [],
        turnCycle: turn ? turn.turnCycle : null,
        totalTurns: turn ? turn.totalTurns : state.totalTurns,
        countdown: turn ? turn.countdown : action.state.countdown,
        currentManche: action.state.current_manche ?? state.currentManche,
        maxManches: action.state.max_manches ?? state.maxManches,
        maxMessageLength: action.state.max_message_length ?? state.maxMessageLength,
        waitingPlayers: action.state.players ?? state.waitingPlayers,
        hasVoted: action.hasVoted,
        votedFor: action.votedFor ?? null,
        roundResults: null,
        aiCharacter: null,
        endGameData: null,
        roomClosedCode: null,
        messages: action.history.map(({ sender, text }) => ({
          id: nextMessageId(),
          kind: 'chat',
          sender,
          text,
        })),
      };
    }
    case 'roundTransition':
      return {
        ...state,
        roundResults: action.results,
        aiCharacter: action.aiCharacter,
      };
    case 'roundCancelled':
      // Meme texte que la ligne systeme du serveur (voir room.js : cancelRound).
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextMessageId(), kind: 'system', text: "Manche annulée : l'IA ne répond plus. Vérification technique en cours." },
        ],
      };
    case 'gameEnd':
      return {
        ...state,
        endGameData: {
          winnerId: action.winnerId,
          ranking: action.ranking,
          history: action.history,
        },
      };
    case 'roomClosed':
      return { ...state, roomClosedCode: action.code };
    case 'resetGame':
      return initialState;
  }
  return state;
}

// La manche en cours vient du serveur ('state' de la room : current_manche et
// max_manches). Plus de total code en dur : la config serveur fait foi.
export function formatRoundIndicator(currentManche: number | null, maxManches: number | null): string {
  if (currentManche === null || currentManche === undefined) return `Manche -/${maxManches ?? '-'}`;
  return `Manche ${currentManche}/${maxManches ?? '-'}`;
}

export function getBanner(state: GameUIState, connectionOpen: boolean): Banner {
  if (!connectionOpen) return { text: 'Reconnexion en cours...', variant: 'waiting' };
  if (state.myCharacter && state.currentTurnCharacter === state.myCharacter && isChattingPhase(state.roomStatus, state.roundPhase)) {
    return { text: 'A TOI DE JOUER', variant: 'myturn' };
  }
  if (state.roundPhase === 'voting') return { text: 'Phase de vote', variant: 'voting' };
  if (isPlayingStatus(state.roomStatus)) {
    return { text: state.currentTurnCharacter ? `Au tour de ${state.currentTurnCharacter}` : 'Partie en cours', variant: 'info' };
  }
  return { text: 'En attente de joueurs...', variant: 'waiting' };
}

export function isTimerVisible(state: GameUIState, connectionOpen: boolean): boolean {
  if (!connectionOpen) return false;
  if (state.roundPhase === 'voting') return false;
  return state.countdown !== null && state.countdown !== undefined;
}

export function getInputState(state: GameUIState, connectionOpen: boolean): InputState {
  if (!connectionOpen) return { enabled: false, placeholder: 'connexion...', myTurn: false };
  if (!isChattingPhase(state.roomStatus, state.roundPhase))
    return { enabled: false, placeholder: 'chat desactive', myTurn: false };
  if (state.myCharacter && state.currentTurnCharacter === state.myCharacter)
    return { enabled: true, placeholder: 'ton message...', myTurn: true };
  return { enabled: false, placeholder: `au tour de ${state.currentTurnCharacter}...`, myTurn: false };
}

export function getConnectionStatus(connectionOpen: boolean | null): ConnectionStatus {
  if (connectionOpen === true) return 'open';
  if (connectionOpen === false) return 'closed';
  return 'connecting';
}

export function getConnectionText(status: ConnectionStatus): string {
  const texts = {
    connecting: 'connexion...',
    open: 'connecte',
    closed: 'deconnecte',
  };
  return texts[status];
}

export function getTimerLabel(roomStatus: string | null): string {
  return isPlayingStatus(roomStatus) ? 'secondes' : 'avant le debut';
}
