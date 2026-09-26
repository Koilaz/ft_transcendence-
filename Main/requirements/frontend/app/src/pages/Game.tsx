import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  connectGameSocket,
  sendChatMessage,
  sendVoteMessage,
  sendReadyMessage,
  getClosedGameCode,
  getInitialConnectionStatus,
  type GameConnection,
  type GameConnectionStatus,
} from '../services/gameSocket';
import { gameReducer, initialState, type GameUIState } from '../services/gameState';
import { VoteMenu, GameEndModal, RoomClosedModal } from './VoteSystem';
import { Lobby } from './Lobby';
import './Game.css';

// ---- Logique métier reprise telle quelle du client HTML existant ----

function isPlayingStatus(status: string | null): boolean {
  return (status ?? '').toLowerCase() === 'playing';
}

function isChattingPhase(
  roomStatus: string | null,
  roundPhase: string | null,
): boolean {
  if (roundPhase === 'voting' || roundPhase === 'resolution') {
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
  const [state, dispatch] = useReducer(gameReducer, initialState, (initial) => ({
    ...initial, closedCode: getClosedGameCode(),
  }));
  const [connectionStatus, setConnectionStatus] = useState<GameConnectionStatus>(getInitialConnectionStatus);
  const connectionOpen = connectionStatus === 'connected';
  const [draft, setDraft] = useState('');

  const [hasAccessToken] = useState(() =>
    Boolean(localStorage.getItem('accessToken')),
  );
  const [guestName] = useState(() => localStorage.getItem('guestName'));
  const connectionRef = useRef<GameConnection | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Le gestionnaire conserve le jeton par onglet et ignore les evenements
  // des anciennes sockets, y compris pendant les montages de StrictMode.
  useEffect(() => {
    const connection = connectGameSocket(dispatch, setConnectionStatus);
    connectionRef.current = connection;

    return () => {
      connection.dispose();
      connectionRef.current = null;
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
    const socket = connectionRef.current?.getSocket();

    if (!text || !socket || !inputState.enabled) {
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
  const isVotingOpen = connectionOpen === true
    && isPlayingStatus(state.roomStatus)
    && state.roundPhase === 'chatting';

  function handleVote(targetCharacter: string) {
    const socket = connectionRef.current?.getSocket();
    if (socket && isVotingOpen && !state.hasVoted) {
      sendVoteMessage(socket, targetCharacter);
    }
  }

  function handleReady() {
    const socket = connectionRef.current?.getSocket();
    if (socket && connectionOpen && !state.isReady) {
      sendReadyMessage(socket);
    }
  }

  // Le serveur ne remet personne dans la file tout seul : sans ce clic, le
  // joueur reste sur l'ecran de resultats aussi longtemps qu'il le souhaite.
  function handleReplay() {
    if (connectionRef.current) {
      dispatch({ type: 'reset' });
      setDraft('');
      connectionRef.current.replay();
    }
  }

  if (connectionStatus === 'reconnecting' && !state.closedCode) {
    return <ConnectionLost />;
  }

  // Le lobby remplace tout l'ecran de jeu : tant qu'aucune room n'existe, il
  // n'y a ni personnages, ni tour, ni chat a afficher.
  if (!state.closedCode && (state.roomStatus === null || state.roomStatus === 'waiting')) {
    return (
      <Lobby
        waiting={state.players}
        minPlayers={state.minPlayers}
        readyPlayers={state.readyPlayers}
        isReady={state.isReady}
        countdown={state.countdown}
        connected={connectionOpen}
        onReady={handleReady}
        agentsDown={state.agentsDown}
      />
    );
  }

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="header-left">
          <h1>AImpostor</h1>
          <span className="tag">Salle #{state.roomNumber ?? '—'}</span>
          {state.maxManches > 0 && (
            <span className="tag" style={{ color: '#38bdf8', fontWeight: 'bold' }}>
              Manche {state.currentManche}/{state.maxManches}
            </span>
          )}
          <span className="tag">{formatRoundIndicator(state.turnCycle, state.totalTurns)}</span>
        </div>

      {/* PARTIE 2 - Dialogue (prend l'espace disponible) */}
      <div className="flex-1 overflow-hidden min-h-0">
        <DialogueArea
          messages={messages}
          myCharacter={myCharacter}
        />
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

                    {state.disconnectedCharacters.includes(character) && (
                      <span className="text-xs text-amber-400">reconnexion…</span>
                    )}

                    {character === state.myCharacter && (
                      <span className="you-badge">toi</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {isPlayingStatus(state.roomStatus) && (
              <VoteMenu 
                key={state.currentManche}
                turnOrder={state.turnOrder} 
                myCharacter={state.myCharacter} 
                hasVoted={state.hasVoted} 
                isVotingOpen={isVotingOpen}
                isLastRound={state.turnCycle === 1}
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
      {/* ÉCRAN DE TRANSITION ENTRE LES MANCHES */}
      {state.roomStatus === 'transition' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="text-center">
            <h2 className="mb-4 text-4xl font-bold text-white animate-pulse">Manche terminée !</h2>
            <p className="text-xl text-sky-400">
              Préparation de la manche suivante dans {state.countdown ?? '-'} secondes...
            </p>
            {state.debriefWaiting && (
              <p className="mt-4 text-lg text-red-400 animate-pulse">
                L'AImpostor rejoue la manche dans sa tête… il apprend de ses erreurs.
              </p>
            )}
          </div>
        </div>
      )}

      {state.roomStatus === 'endGame' && state.winnerId && state.gameRanking && state.gameRanking && state.gameHistory && (
        <GameEndModal 
          winnerId={state.winnerId} 
          ranking={state.gameRanking}
          history={state.gameHistory}
          onReplay={handleReplay}
        />
      )}

      {/* Fermeture qui n'est pas une fin de partie normale : quorum non
          atteint, room desertee. Le classement n'existe pas dans ce cas. */}
      {state.closedCode && (state.closedCode !== 'game_finished' || !state.gameRanking) && (
        <RoomClosedModal code={state.closedCode} onReplay={handleReplay} />
      )}
    </div> // Fin de <div className="game-page">
  );
}

function ConnectionLost() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-red-900/60 bg-slate-900 p-8 text-center">
        <h2 className="text-2xl font-bold text-amber-400 mb-3">Reconnexion en cours…</h2>
        <p role="status" className="text-slate-400 mb-6">
          Nous tentons de rétablir la connexion automatiquement. La manche continue :
          si tu reviens avant sa fin, tu retrouveras ton personnage, tes messages et ton vote.
        </p>

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
