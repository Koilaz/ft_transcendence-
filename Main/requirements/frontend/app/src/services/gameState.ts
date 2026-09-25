import type { GameMessage, RoundResult, FinalRank, AgentStatus, ChatHistoryItem } from './gameSocket';

type FeedMessage =
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
  hasVoted: boolean;
  roundResults: RoundResult[] | null;
  aiCharacter: string | null;
  gameRanking: FinalRank[] | null;
  winnerId: string | null;
  totalTurns: number | null;
  // Nombre de joueurs annonce par le serveur : effectif de la file en lobby,
  // effectif de la room une fois la partie lancee.
  players: number;
  minPlayers: number;
  readyPlayers: number;
  isReady: boolean;
  // Personnages dont le joueur a quitte la partie. Ils restent affiches, mais
  // grises : le serveur les conserve dans turnOrder, c'est au front de montrer
  // qu'ils ne jouent plus.
  leftCharacters: string[];
  disconnectedCharacters: string[];
  // Motif de fermeture de la room, null tant qu'elle est vivante.
  closedCode: string | null;
  // Bots annonces hors service par le serveur a la connexion. Vide dans le cas
  // normal, et l'ecrasante majorite des parties n'y touchera jamais.
  agentsDown: AgentStatus[];
  gameHistory: ChatHistoryItem[] | null;
  // L'IA prend plus longtemps que prevu pour analyser la manche precedente : le
  // compte a rebours de transition est reparti de zero. Remis a false au debut
  // de chaque transition.
  debriefWaiting: boolean;
  currentManche: number;
  maxManches: number;
};

export const initialState: GameUIState = {
  myCharacter: null,
  roomNumber: null,
  roomStatus: null,
  roundPhase: null,
  currentTurnCharacter: null,
  turnOrder: [],
  turnCycle: null,
  countdown: null,
  messages: [],
  hasVoted: false,
  roundResults: null,
  aiCharacter: null,
  gameRanking: null,
  winnerId: null,
  totalTurns: null,
  players: 0,
  minPlayers: 1,
  readyPlayers: 0,
  isReady: false,
  leftCharacters: [],
  disconnectedCharacters: [],
  closedCode: null,
  agentsDown: [],
  gameHistory: null,
  debriefWaiting: false,
  currentManche: 0,
  maxManches: 0,
};

// Remise a zero locale quand le joueur redemande une partie : le serveur, lui,
// ne renvoie jamais d'etat initial.
type LocalResetAction = { type: 'reset' };
type GameAction = GameMessage | LocalResetAction;

let messageIdCounter = 0;

function nextMessageId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

export function gameReducer(state: GameUIState, action: GameAction): GameUIState {
  switch (action.type) {
    // Un seul remplacement evite d'appliquer une assignment qui effacerait
    // l'historique ou le vote au milieu de la restauration.
    case 'reconnected':
      return {
        ...initialState,
        agentsDown: state.agentsDown,
        myCharacter: action.character,
        roomNumber: action.state.room_number,
        roomStatus: action.state.status,
        players: action.state.players,
        minPlayers: action.state.min_players ?? state.minPlayers,
        readyPlayers: action.state.ready_players ?? 0,
        isReady: action.state.ready ?? false,
        currentManche: action.state.current_manche ?? state.currentManche,
        maxManches: action.state.max_manches ?? state.maxManches,
        roundPhase: action.roundPhase,
        currentTurnCharacter: action.turn?.character ?? null,
        turnOrder: action.turn?.turnOrder ?? [],
        turnCycle: action.turn?.turnCycle ?? null,
        totalTurns: action.turn?.totalTurns ?? null,
        countdown: action.turn?.countdown ?? action.state.countdown,
        hasVoted: action.hasVoted,
        disconnectedCharacters: action.disconnectedCharacters,
        leftCharacters: action.leftCharacters,
        debriefWaiting: action.debriefWaiting,
        messages: action.history.map(({ sender, text }) => sender === 'Systeme'
          ? { id: nextMessageId(), kind: 'system', text }
          : { id: nextMessageId(), kind: 'chat', sender, text }),
      };

    case 'state': {
      const playing = action.status.toLowerCase() === 'playing';

      return {
        ...state,
        roomNumber: action.room_number,
        roomStatus: action.status,
        players: action.players,
        minPlayers: action.min_players ?? state.minPlayers,
        readyPlayers: action.ready_players ?? state.readyPlayers,
        isReady: action.ready ?? state.isReady,
        currentManche: action.current_manche ?? state.currentManche,
        maxManches: action.max_manches ?? state.maxManches,
        ...(playing
          ? {}
          : {
              currentTurnCharacter: null,
              turnOrder: [],
              countdown: action.countdown,
            }),
      };
    }

    case 'assignment':
      return {
        ...state,
        myCharacter: action.character,
        hasVoted: false,
        roundResults: null,
        aiCharacter: null,
        // Un nom de personnage n'a de sens QUE dans sa manche : ils sont
        // retires au sort a chaque nouvelle manche. Garder les partants d'une
        // manche a l'autre grisait un joueur bien present, celui qui heritait
        // du personnage libere, et interdisait de voter pour lui.
        // Les joueurs reellement partis, eux, ne figurent plus du tout dans le
        // turnOrder de la manche suivante : il n'y a rien a reporter.
        leftCharacters: [],
        disconnectedCharacters: [],
        // Meme raison : les messages de la manche precedente portent des noms
        // qui designent desormais quelqu'un d'autre. Les garder lisibles
        // permettrait de reporter de fausses deductions d'une manche a l'autre,
        // ce que le rebrassage des personnages existe pour empecher.
        messages: [
          {
            id: nextMessageId(),
            kind: 'system',
            text: `>>> nouvelle manche, tu incarnes ${action.character}`,
          },
        ],
      };

    case 'voteRegistered':
      return { ...state, hasVoted: true };

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
        roundPhase: 'chatting',
        countdown: action.countdown,
        totalTurns: action.totalTurns
      };

    case 'chat':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: nextMessageId(),
            kind: 'chat',
            sender: action.sender,
            text: action.text,
          },
        ],
      };

    case 'roundState':
      return { ...state, roundPhase: action.status };


    case 'roundTransition':
      return {
        ...state,
        roomStatus: 'transition',
        debriefWaiting: false
      };

    // Le serveur prolonge la transition : l'analyse de la manche precedente
    // n'est pas revenue. Le compte a rebours repart tout seul via 'state', il
    // ne reste qu'a dire au joueur pourquoi.
    case 'debriefWait':
      return {
        ...state,
        debriefWaiting: true
      };

    case 'gameEnd':
      return {
        ...state,
        gameRanking: action.ranking,
        winnerId: action.winnerId,
        gameHistory: action.history,
        roomStatus: 'endGame'
      };

    case 'playerDisconnected':
      return {
        ...state,
        leftCharacters: action.temporary || state.leftCharacters.includes(action.character)
          ? state.leftCharacters
          : [...state.leftCharacters, action.character],
        disconnectedCharacters: action.temporary
          ? [...new Set([...state.disconnectedCharacters, action.character])]
          : state.disconnectedCharacters.filter((character) => character !== action.character),
        messages: [
          ...state.messages,
          {
            id: nextMessageId(),
            kind: 'system',
            text: action.temporary
              ? `${action.character} a perdu la connexion et peut revenir avant la fin de la manche.`
              : `${action.character} a quitté la séance.`,
          },
        ],
      };

    case 'playerReconnected':
      return {
        ...state,
        disconnectedCharacters: state.disconnectedCharacters.filter((character) => character !== action.character),
        messages: [...state.messages, {
          id: nextMessageId(), kind: 'system', text: `${action.character} est de retour.`,
        }],
      };

    // On ne touche PAS a roomStatus : le classement de fin de partie doit
    // rester affiche jusqu'a ce que le joueur clique sur « Rejouer ».
    case 'roomClosed':
      return {
        ...state,
        closedCode: action.code,
        roomNumber: null,
        currentTurnCharacter: null,
        countdown: null,
      };

    case 'agentsDown':
      return { ...state, agentsDown: action.agents };

    // La socket n'est pas rouverte au « Rejouer » : le serveur ne renverra
    // jamais son diagnostic, donc on le garde plutot que de renvoyer le joueur
    // dans la file sans l'avertissement qu'il vient de lire.
    case 'reset':
      return { ...initialState, agentsDown: state.agentsDown };

    case 'silence':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: nextMessageId(),
            kind: 'system',
            text: `${action.character} est resté muet ce tour...`,
          },
        ],
      };
  }

  return state;
}
