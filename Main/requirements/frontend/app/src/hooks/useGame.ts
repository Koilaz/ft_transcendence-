// @ts-nocheck
import { useEffect, useReducer, useRef, useState } from 'react';
import { connectGameSocket, sendChatMessage, sendVoteMessage, sendReplayMessage, sendReadyMessage, RESUME_TOKEN_STORAGE_KEY, discardResumeToken } from '../services/gameSocket';
import {
  gameReducer,
  initialState,
  getBanner,
  isTimerVisible,
  getInputState,
  getConnectionStatus,
  getConnectionText,
  getTimerLabel,
  formatRoundIndicator,
} from '../services/gameState';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [connectionOpen, setConnectionOpen] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [hasAccessToken] = useState(() => Boolean(localStorage.getItem('accessToken')));
  const [guestName] = useState(() => localStorage.getItem('guestName'));

  const socketRef = useRef<WebSocket | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Fin definitive pour cette session (room fermee, onglet remplace) : la
  // boucle de reconnexion s'arrete, seul « Rejouer » la relance.
  const terminalRef = useRef(false);
  const reconnectRef = useRef<(() => void) | null>(null);

  // Connexion WebSocket avec reprise automatique. Le serveur garde la place
  // jusqu'a la fin de la manche ; chaque nouvelle tentative rouvre la session
  // via le jeton sessionStorage, et c'est lui qui decide de la suite :
  // instantane 'reconnected', retour en file, ou 'reconnect_expired'.
  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let handshakeTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let currentSocket: WebSocket | null = null;

    // Backoff geometrique plafonne : un serveur arrete ne doit pas se prendre
    // un essai par seconde pendant une heure. Trois cas coupent net la boucle :
    // unmount, fin definitive (terminalRef), onglet masque (reprise au retour).
    function scheduleReconnect() {
      if (disposed || terminalRef.current || document.hidden)
        return;
      const delay = Math.min(1000 * 2 ** attempts, 8000);
      attempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect() {
      const socket = connectGameSocket((message) => {
        clearTimeout(handshakeTimer);
        // Le jeton de reprise est un effet de bord, pas un etat d'UI : il
        // change a chaque connexion, on ecrase simplement l'ancien.
        if (message.type === 'session') {
          sessionStorage.setItem(RESUME_TOKEN_STORAGE_KEY, message.token);
          return;
        }
        if (message.type === 'roomClosed') {
          // Fin definitive pour cette session : plus aucune tentative, et le
          // jeton ne sert plus a rien (sa room est morte).
          terminalRef.current = true;
          discardResumeToken();
        }
        dispatch(message);
      });
      currentSocket = socket;
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        if (disposed)
          return;
        attempts = 0;
        setConnectionOpen(true);
        dispatch({ type: 'connection', text: 'connecte' });
      });
      socket.addEventListener('close', (event) => {
        if (socket !== currentSocket || disposed)
          return;
        currentSocket = null;
        setConnectionOpen(false);
        // Un autre onglet a pris la session (socket remplacee) : la reprendre
        // la volerait en retour, ping-pong infini entre onglets. On s'arrete.
        if (event.code === 4001) {
          terminalRef.current = true;
          discardResumeToken();
          dispatch({ type: 'roomClosed', code: 'session_replaced' });
          return;
        }
        dispatch({ type: 'connection', text: 'deconnecte' });
        scheduleReconnect();
      });
      socket.addEventListener('error', () => {
        if (!disposed)
          setConnectionOpen(false);
      });

      // Poignee de main muette : une socket ouverte mais silencieuse depuis
      // 10 s est consideree cassee — on la coupe, le close planifie la suite.
      // Le serveur parle des l'ouverture (message 'session').
      handshakeTimer = setTimeout(() => {
        if (!disposed && socket === currentSocket)
          socket.close();
      }, 10000);
    }

    // Onglet masque : aucune tentative tant que le joueur ne regarde pas ;
    // des qu'il revient, on reprend ou l'on etait.
    function onVisibility() {
      if (!document.hidden && !currentSocket && !disposed)
        scheduleReconnect();
    }
    document.addEventListener('visibilitychange', onVisibility);

    connect();
    reconnectRef.current = connect;

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (reconnectTimer)
        clearTimeout(reconnectTimer);
      if (handshakeTimer)
        clearTimeout(handshakeTimer);
      socketRef.current?.close();
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

  function handleVote(character: string) {
    const socket = socketRef.current;
    if (!socket) return;
    sendVoteMessage(socket, character);
  }

  function handleReplay() {
    // Une fin definitive (room fermee, onglet remplace) avait coupe la boucle
    // de reconnexion : « Rejouer » est le seul retour en piste autorise.
    terminalRef.current = false;
    dispatch({ type: 'resetGame' });
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendReplayMessage(socket);
      return;
    }
    reconnectRef.current?.();
  }

  function handleReady() {
    const socket = socketRef.current;
    if (!socket) return;
    sendReadyMessage(socket);
  }

  // Calculs dérivés
  const banner = getBanner(state, connectionOpen === true);
  const timerVisible = isTimerVisible(state, connectionOpen === true);
  const timerLabel = getTimerLabel(state.roomStatus);
  const connStatus = getConnectionStatus(connectionOpen);
  const connText = getConnectionText(connStatus);
  const isGuest = !hasAccessToken;
  const roundIndicator = formatRoundIndicator(state.currentManche, state.maxManches);

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
    handleVote,
    handleReplay,
    handleReady,
    banner,
    bannerStyle,
    timerVisible,
    timerLabel,
    roundIndicator,
    // Nouveaux exports pour la nouvelle UI
    roomNumber: state.roomNumber,
    roomStatus: state.roomStatus,
    roundPhase: state.roundPhase,
    roundResults: state.roundResults,
    aiCharacter: state.aiCharacter,
    endGameData: state.endGameData,
    roomClosedCode: state.roomClosedCode,
    turnOrder: state.turnOrder,
    currentTurnCharacter: state.currentTurnCharacter,
    myCharacter: state.myCharacter,
    countdown: state.countdown,
    messages: state.messages,
    // File d'attente : compteurs et bouton « Pret »
    waitingPlayers: state.waitingPlayers,
    minPlayers: state.minPlayers,
    readyPlayers: state.readyPlayers,
    isReady: state.isReady,
    agentsDown: state.agentsDown,
    currentManche: state.currentManche,
    maxManches: state.maxManches,
    debriefWait: state.debriefWait,
    hasVoted: state.hasVoted,
    disconnectedCharacters: state.disconnectedCharacters,
    leftCharacters: state.leftCharacters,
  };
}
