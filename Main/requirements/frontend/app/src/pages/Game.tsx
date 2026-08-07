import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  connectGameSocket,
  sendChatMessage,
  type GameMessage,
} from '../services/gameSocket';
import './Game.css';

type FeedMessage =
  | { id: string; kind: 'chat'; sender: string; text: string }
  | { id: string; kind: 'system'; text: string };

type GameUIState = {
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

// Pas de "join"/"quickplay" : le serveur assigne le joueur des l'ouverture de
// la socket. On ajoute juste une action locale pour les lignes "connecté" /
// "déconnecté" du fil, qui n'existent pas dans le protocole serveur.
type LocalConnectionAction = { type: 'connection'; text: string };
type GameAction = GameMessage | LocalConnectionAction;

let messageIdCounter = 0;

function nextMessageId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

function gameReducer(state: GameUIState, action: GameAction): GameUIState {
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
        messages: [
          ...state.messages,
          {
            id: nextMessageId(),
            kind: 'system',
            text: `>>> nouvelle manche, tu incarnes ${action.character}`,
          },
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

// ---- Logique métier reprise telle quelle du client HTML existant ----

function isPlayingStatus(status: string | null): boolean {
  return (status ?? '').toLowerCase() === 'playing';
}

function isChattingPhase(
  roomStatus: string | null,
  roundPhase: string | null,
): boolean {
  if (roundPhase === 'voting') {
    return false;
  }

  return isPlayingStatus(roomStatus);
}

function formatRoundIndicator(turnCycle: number | null): string {
  if (turnCycle === null || turnCycle === undefined) {
    return 'Round -/5';
  }

  const round = 5 - turnCycle + 1;

  return `Round ${round}/5`;
}

function colorFor(sender: string): string {
  let hash = 0;

  for (let i = 0; i < sender.length; i++) {
    hash = sender.charCodeAt(i) + ((hash << 5) - hash);
  }

  return `hsl(${hash % 360}, 65%, 55%)`;
}

function initialsFor(sender: string): string {
  const parts = sender.split(/[\s-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return sender.slice(0, 2).toUpperCase();
}

// ---- Dérivations pour le rendu (remplacent updateBanner/refreshInputState) ----

type Banner = { text: string; variant: string };

function getBanner(state: GameUIState, connectionOpen: boolean): Banner {
  if (!connectionOpen) {
    return { text: 'Connexion au serveur…', variant: 'waiting' };
  }

  if (
    state.myCharacter &&
    state.currentTurnCharacter === state.myCharacter &&
    isChattingPhase(state.roomStatus, state.roundPhase)
  ) {
    return { text: 'À TOI DE JOUER', variant: 'myturn' };
  }

  if (state.roundPhase === 'voting') {
    return { text: 'Phase de vote', variant: 'voting' };
  }

  if (isPlayingStatus(state.roomStatus)) {
    return {
      text: state.currentTurnCharacter
        ? `Au tour de ${state.currentTurnCharacter}`
        : 'Partie en cours',
      variant: 'info',
    };
  }

  return { text: 'En attente de joueurs…', variant: 'waiting' };
}

function isTimerVisible(state: GameUIState, connectionOpen: boolean): boolean {
  if (!connectionOpen) {
    return false;
  }

  if (state.roundPhase === 'voting') {
    return false;
  }

  return state.countdown !== null && state.countdown !== undefined;
}

type InputState = { enabled: boolean; placeholder: string; myTurn: boolean };

function getInputState(
  state: GameUIState,
  connectionOpen: boolean,
): InputState {
  if (!connectionOpen) {
    return { enabled: false, placeholder: 'connexion…', myTurn: false };
  }

  if (!isChattingPhase(state.roomStatus, state.roundPhase)) {
    return { enabled: false, placeholder: 'chat désactivé', myTurn: false };
  }

  if (state.myCharacter && state.currentTurnCharacter === state.myCharacter) {
    return { enabled: true, placeholder: 'ton message…', myTurn: true };
  }

  return {
    enabled: false,
    placeholder: `au tour de ${state.currentTurnCharacter}…`,
    myTurn: false,
  };
}

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [connectionOpen, setConnectionOpen] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');

  const [hasAccessToken] = useState(() =>
    Boolean(localStorage.getItem('accessToken')),
  );
  const [guestName] = useState(() => localStorage.getItem('guestName'));

  const socketRef = useRef<WebSocket | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Une seule connexion par montage : la fonction de nettoyage qui ferme la
  // socket est obligatoire, sinon StrictMode (mount -> cleanup -> mount en
  // dev) laisse deux joueurs connectés côté serveur.
  useEffect(() => {
    const socket = connectGameSocket((message) => {
      dispatch(message);
    });

    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setConnectionOpen(true);
      dispatch({ type: 'connection', text: 'connecté' });
    });

    socket.addEventListener('close', () => {
      setConnectionOpen(false);
      dispatch({ type: 'connection', text: 'déconnecté' });
    });

    socket.addEventListener('error', () => {
      setConnectionOpen(false);
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const feed = feedRef.current;

    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  }, [state.messages]);

  const inputState = getInputState(state, connectionOpen === true);

  useEffect(() => {
    if (inputState.myTurn) {
      inputRef.current?.focus();
    }
  }, [inputState.myTurn]);

  function handleSend() {
    const text = draft.trim();
    const socket = socketRef.current;

    if (!text || !socket) {
      return;
    }

    sendChatMessage(socket, text);
    setDraft('');
  }

  const banner = getBanner(state, connectionOpen === true);
  const timerVisible = isTimerVisible(state, connectionOpen === true);
  const timerLabel = isPlayingStatus(state.roomStatus)
    ? 'secondes'
    : 'avant le début';

  const connLabel =
    connectionOpen === true
      ? 'open'
      : connectionOpen === false
        ? 'closed'
        : 'connecting';

  const connText = {
    connecting: 'connexion…',
    open: 'connecté',
    closed: 'déconnecté',
  }[connLabel];

  const isGuest = !hasAccessToken;

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="header-left">
          <h1>AImpostor</h1>
          <span className="tag">Salle #{state.roomNumber ?? '—'}</span>
          <span className="tag">{formatRoundIndicator(state.turnCycle)}</span>
        </div>

        <div className="header-right">
          {isGuest && guestName && (
            <span className="tag">Invité : {guestName}</span>
          )}

          {state.myCharacter && (
            <span className="tag character-badge">
              Tu incarnes : <strong>{state.myCharacter}</strong>
            </span>
          )}

          <Link to="/" className="tag">
            ← Accueil
          </Link>

          <div className={`conn ${connLabel}`}>
            <span className="dot" />
            <span>{connText}</span>
          </div>
        </div>
      </header>

      <div
        className={`status-banner ${banner.variant ? `banner-${banner.variant}` : ''}`}
      >
        <span>{banner.text}</span>

        {timerVisible && (
          <div className="timer-box">
            <div className="timer-value">{state.countdown}</div>
            <div className="timer-label">{timerLabel}</div>
          </div>
        )}
      </div>

      <section className="game-area">
        {state.turnOrder.length > 0 && (
          <aside className="player-panel">
            <h2>Joueurs</h2>

            <ul className="player-list">
              {state.turnOrder.map((character) => (
                <li
                  key={character}
                  className={
                    character === state.currentTurnCharacter ? 'active' : ''
                  }
                >
                  <div className="player-identity">
                    <div
                      className="avatar player-avatar"
                      style={{ background: colorFor(character) }}
                    >
                      {initialsFor(character)}
                    </div>

                    <span>{character}</span>
                  </div>

                  <div className="player-badges">
                    {character === state.currentTurnCharacter && (
                      <span className="turn-badge">● en train de jouer</span>
                    )}

                    {character === state.myCharacter && (
                      <span className="you-badge">toi</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="chat-panel">
          <div className="feed" ref={feedRef}>
            {state.messages.map((message) =>
              message.kind === 'chat' ? (
                <div className="msg" key={message.id}>
                  <div
                    className="avatar"
                    style={{ background: colorFor(message.sender) }}
                  >
                    {initialsFor(message.sender)}
                  </div>

                  <div className="msg-body">
                    <div className="msg-sender">{message.sender}</div>
                    <div className="msg-text">{message.text}</div>
                  </div>
                </div>
              ) : (
                <div className="msg system" key={message.id}>
                  <div className="msg-body">{message.text}</div>
                </div>
              ),
            )}
          </div>

          <div className="composer">
            <input
              ref={inputRef}
              className={`chat-input ${inputState.myTurn ? 'my-turn' : ''}`}
              value={draft}
              disabled={!inputState.enabled}
              placeholder={inputState.placeholder}
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSend();
                }
              }}
            />

            <button
              type="button"
              className="send-button"
              disabled={!inputState.enabled || !draft.trim()}
              onClick={handleSend}
            >
              envoyer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
