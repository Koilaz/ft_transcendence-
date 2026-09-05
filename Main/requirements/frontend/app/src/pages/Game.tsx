// @ts-nocheck
import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  connectGameSocket,
  sendChatMessage,
  sendVoteMessage,
  sendReplayMessage,
  type GameMessage,
  type RoundResult,
  type FinalRank,
} from '../services/gameSocket';
import { VoteMenu, ScoreboardModal, GameEndModal, RoomClosedModal } from './VoteSystem';
import { Lobby } from './Lobby';
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
  hasVoted: boolean;
  roundResults: RoundResult[] | null;
  aiCharacter: string | null;
  gameRanking: FinalRank[] | null;
  winnerId: string | null;
  totalTurns: number | null;
  // Nombre de joueurs annonce par le serveur : effectif de la file en lobby,
  // effectif de la room une fois la partie lancee.
  players: number;
  // Personnages dont le joueur a quitte la partie. Ils restent affiches, mais
  // grises : le serveur les conserve dans turnOrder, c'est au front de montrer
  // qu'ils ne jouent plus.
  leftCharacters: string[];
  // Motif de fermeture de la room, null tant qu'elle est vivante.
  closedCode: string | null;
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
  hasVoted: false,
  roundResults: null,
  aiCharacter: null,
  gameRanking: null,
  winnerId: null,
  totalTurns: null,
  players: 0,
  leftCharacters: [],
  closedCode: null
};

// Pas de "join"/"quickplay" : le serveur assigne le joueur des l'ouverture de
// la socket. On ajoute juste une action locale pour les lignes "connecté" /
// "déconnecté" du fil, qui n'existent pas dans le protocole serveur.
type LocalConnectionAction = { type: 'connection'; text: string };
// Remise a zero locale quand le joueur redemande une partie : le serveur, lui,
// ne renvoie jamais d'etat initial.
type LocalResetAction = { type: 'reset' };
type GameAction = GameMessage | LocalConnectionAction | LocalResetAction;

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
        players: action.players,
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
        messages: [
          ...state.messages,
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


    case 'roundEnd':
      return {
        ...state,
        roundResults: action.results,
        aiCharacter: action.aiCharacter
      };

    case 'gameEnd':
      return {
        ...state,
        gameRanking: action.ranking,
        winnerId: action.winnerId,
        roomStatus: 'endGame'
      };

    case 'playerDisconnected':
      return {
        ...state,
        leftCharacters: state.leftCharacters.includes(action.character)
          ? state.leftCharacters
          : [...state.leftCharacters, action.character],
        messages: [
          ...state.messages,
          {
            id: nextMessageId(),
            kind: 'system',
            text: `${action.character} a quitté la séance.`,
          },
        ],
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

    case 'reset':
      return { ...initialState };

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

function formatRoundIndicator(turnCycle: number | null, totalTurns: number | null): string {
  if (turnCycle === null || totalTurns === null) {
    return 'Round -/-';
  }

  const currentRound = totalTurns - turnCycle + 1;
  return `Round ${currentRound}/${totalTurns}`;
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
  const [hasConnected, setHasConnected] = useState(false);

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
      // Memorise qu'une connexion a bien eu lieu : sans ce drapeau, l'ecran de
      // perte de connexion s'afficherait une fraction de seconde au chargement,
      // avant meme la premiere ouverture de socket.
      setHasConnected(true);
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

  function handleVote(targetCharacter: string) {
    if (socketRef.current) {
      sendVoteMessage(socketRef.current, targetCharacter);
    }
  }

  // Le serveur ne remet personne dans la file tout seul : sans ce clic, le
  // joueur reste sur l'ecran de resultats aussi longtemps qu'il le souhaite.
  function handleReplay() {
    if (socketRef.current) {
      sendReplayMessage(socketRef.current);
      dispatch({ type: 'reset' });
    }
  }

  // Aucune reconnexion n'est prevue (arbitrage A2 du plan) : une socket perdue
  // est definitive. Autant le dire clairement plutot que d'afficher un
  // « Connexion au serveur… » qui laisserait croire a une tentative en cours.
  if (hasConnected && !connectionOpen) {
    return <ConnectionLost />;
  }

  // Le lobby remplace tout l'ecran de jeu : tant qu'aucune room n'existe, il
  // n'y a ni personnages, ni tour, ni chat a afficher.
  if (!state.closedCode && (state.roomStatus === null || state.roomStatus === 'waiting')) {
    return (
      <Lobby
        waiting={state.players}
        countdown={state.countdown}
        connected={connectionOpen}
      />
    );
  }

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="header-left">
          <h1>AImpostor</h1>
          <span className="tag">Salle #{state.roomNumber ?? '—'}</span>
          <span className="tag">{formatRoundIndicator(state.turnCycle, state.totalTurns)}</span>
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
                  className={[
                    character === state.currentTurnCharacter ? 'active' : '',
                    // Le partant reste visible : le retirer laisserait croire
                    // qu'il n'a jamais joue, et fausserait la lecture du tour.
                    state.leftCharacters.includes(character) ? 'opacity-40' : '',
                  ].join(' ').trim()}
                >
                  <div className="player-identity">
                    <div
                      className="avatar player-avatar"
                      style={{ background: colorFor(character) }}
                    >
                      {initialsFor(character)}
                    </div>

                    <span
                      className={
                        state.leftCharacters.includes(character)
                          ? 'line-through'
                          : ''
                      }
                    >
                      {character}
                    </span>
                  </div>

                  <div className="player-badges">
                    {character === state.currentTurnCharacter && (
                      <span className="turn-badge">● en train de jouer</span>
                    )}

                    {state.leftCharacters.includes(character) && (
                      <span className="text-xs text-slate-500">parti</span>
                    )}

                    {character === state.myCharacter && (
                      <span className="you-badge">toi</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {isChattingPhase(state.roomStatus, state.roundPhase) && (
              <VoteMenu 
                turnOrder={state.turnOrder} 
                myCharacter={state.myCharacter} 
                hasVoted={state.hasVoted} 
                leftCharacters={state.leftCharacters}
                onVote={handleVote} 
              />
            )}
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
      {/* AFFICHAGE DES MODALES DE RÉSULTATS */}
      {state.roomStatus === 'scoreboard' && state.roundResults && state.aiCharacter && (
        <ScoreboardModal 
          aiCharacter={state.aiCharacter} 
          results={state.roundResults} 
          countdown={state.countdown} 
        />
      )}

      {state.roomStatus === 'endGame' && state.winnerId && state.gameRanking && (
        <GameEndModal 
          winnerId={state.winnerId} 
          ranking={state.gameRanking} 
          onReplay={handleReplay}
          canReplay={state.closedCode !== null}
        />
      )}

      {/* Fermeture qui n'est pas une fin de partie normale : quorum non
          atteint, room desertee. Le classement n'existe pas dans ce cas. */}
      {state.closedCode && state.closedCode !== 'game_finished' && (
        <RoomClosedModal code={state.closedCode} onReplay={handleReplay} />
      )}
    </div> // Fin de <div className="game-page">
  );
}

// Ecran terminal : la partie est perdue pour ce joueur, il n'y a rien a
// retenter depuis cette page. Recharger ouvre une nouvelle session.
function ConnectionLost() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-red-900/60 bg-slate-900 p-8 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-3">Liaison rompue</h2>
        <p className="text-slate-400 mb-6">
          La connexion au serveur a été perdue. Ta place dans la séance en cours
          est perdue : il faut rejoindre une nouvelle partie.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 transition"
        >
          Rejoindre une nouvelle partie
        </button>

        <button
          onClick={() => { window.location.href = '/'; }}
          className="mt-2 w-full rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 transition"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
