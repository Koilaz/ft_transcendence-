// @ts-nocheck
import { useEffect, useReducer, useRef, useState } from 'react';
import { connectGameSocket, sendChatMessage } from '../services/gameSocket';
import type {
  GameUIState,
  GameAction,
  Banner,
  InputState,
  ConnectionStatus,
} from '../types/game';

const initialState: GameUIState = {
  myCharacter: null,
  roomNumber: null,
  roomStatus: null,
  roundPhase: null,
  currentTurnCharacter: null,
  turnOrder: [],
  turnCycle: null,
  countdown: null,
  messages: [],
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
        ...(playing ? {} : {
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
        messages: [
          ...state.messages,
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
    case 'roundState':
      return { ...state, roundPhase: action.status };
    case 'silence':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextMessageId(), kind: 'system', text: `${action.character} est resté muet ce tour...` },
        ],
      };
  }
  return state;
}

function formatRoundIndicator(turnCycle: number | null): string {
  if (turnCycle === null || turnCycle === undefined) return 'Round -/5';
  const round = 5 - turnCycle + 1;
  return `Round ${round}/5`;
}

export function getBanner(state: GameUIState, connectionOpen: boolean): Banner {
  if (!connectionOpen) return { text: 'Connexion au serveur...', variant: 'waiting' };
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

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [connectionOpen, setConnectionOpen] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [hasAccessToken] = useState(() => Boolean(localStorage.getItem('accessToken')));
  const [guestName] = useState(() => localStorage.getItem('guestName'));
  
  const socketRef = useRef<WebSocket | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Connexion WebSocket
  useEffect(() => {
    const socket = connectGameSocket((message) => dispatch(message));
    socketRef.current = socket;
    socket.addEventListener('open', () => {
      setConnectionOpen(true);
      dispatch({ type: 'connection', text: 'connecte' });
    });
    socket.addEventListener('close', () => {
      setConnectionOpen(false);
      dispatch({ type: 'connection', text: 'deconnecte' });
    });
    socket.addEventListener('error', () => setConnectionOpen(false));
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  // Scroll automatique du chat
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [state.messages]);

  // Focus automatique sur l'input quand c'est son tour
  const inputState = getInputState(state, connectionOpen === true);
  useEffect(() => {
    if (inputState.myTurn) inputRef.current?.focus();
  }, [inputState.myTurn]);

  function handleSend() {
    const text = draft.trim();
    const socket = socketRef.current;
    if (!text || !socket) return;
    sendChatMessage(socket, text);
    setDraft('');
  }

  // Calculs dérivés
  const banner = getBanner(state, connectionOpen === true);
  const timerVisible = isTimerVisible(state, connectionOpen === true);
  const timerLabel = getTimerLabel(state.roomStatus);
  const connStatus = getConnectionStatus(connectionOpen);
  const connText = getConnectionText(connStatus);
  const isGuest = !hasAccessToken;
  const roundIndicator = formatRoundIndicator(state.turnCycle);

  const bannerStyle = (() => {
    switch (banner.variant) {
      case 'myturn': return 'bg-green-500/10 border-green-500 text-green-400 font-bold';
      case 'voting': return 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold';
      default: return 'text-stone-500';
    }
  })();

  return {
    state,
    connectionOpen,
    connStatus,
    connText,
    draft,
    setDraft,
    inputState,
    hasAccessToken,
    guestName,
    isGuest,
    socketRef,
    feedRef,
    inputRef,
    handleSend,
    banner,
    bannerStyle,
    timerVisible,
    timerLabel,
    roundIndicator,
    // Nouveaux exports pour la nouvelle UI
    roomNumber: state.roomNumber,
    roundPhase: state.roundPhase,
    turnOrder: state.turnOrder,
    currentTurnCharacter: state.currentTurnCharacter,
    myCharacter: state.myCharacter,
    countdown: state.countdown,
    messages: state.messages,
  };
}
