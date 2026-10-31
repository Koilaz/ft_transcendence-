import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { MatrixRain } from '../components/MatrixRain';
import { discardResumeToken } from '../services/gameSocket';
import {
  GameHeader,
  DialogueArea,
  VoteArea,
  ChatInput,
} from '../components/game';
import { ScoreboardModal, GameEndModal, RoomClosedModal } from './VoteSystem';
import { Lobby } from './Lobby';

export default function Game() {
  const navigate = useNavigate();
  const {
    connectionOpen,
    roomNumber,
    roundPhase,
    turnOrder,
    turnCycle,
    totalTurns,
    maxManches,
    currentManche,
    currentTurnCharacter,
    myCharacter,
    countdown,
    messages,
    timerVisible,
    roundIndicator,
    draft,
    setDraft,
    inputState,
    inputRef,
    handleSend,
    handleVote,
    handleReplay,
    roomStatus,
    roundResults,
    aiCharacter,
    endGameData,
    roomClosedCode,
    debriefWait,
    hasVoted,
    votedFor,
    waitingPlayers,
    minPlayers,
    readyPlayers,
    isReady,
    agentsDown,
    handleReady,
    socketRef,
  } = useGame();

  const handleQuit = () => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    discardResumeToken();
    navigate('/');
  };

  // File d'attente : tant que le serveur n'a pas ouvert de room ('waiting'),
  // l'ecran montre le lore et le bouton « Pret ». Des que la partie demarre,
  // le 'state' de la room passe le statut a 'playing'.
  if (
    (roomStatus === null || roomStatus === 'waiting') &&
    !endGameData &&
    !roomClosedCode
  ) {
    return (
      <Lobby
        waiting={waitingPlayers}
        minPlayers={minPlayers}
        readyPlayers={readyPlayers}
        isReady={isReady}
        countdown={countdown}
        connected={connectionOpen === true}
        agentsDown={agentsDown}
        onReady={handleReady}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col w-full overflow-hidden">
      {/* MatrixRain global pour toute la page de jeu */}
      <MatrixRain className="absolute inset-0 -z-10" />
      
      {/* PARTIE 1 - Header (8%) */}
      <div className="h-[8%] flex-shrink-0 bg-abyss-950/50 backdrop-blur-sm">
        <GameHeader
          roomNumber={roomNumber}
          roundIndicator={roundIndicator}
          turnCycle={turnCycle}
          totalTurns={totalTurns}
          maxManches={maxManches}
          countdown={countdown}
          timerVisible={timerVisible}
          onQuit={handleQuit}
        />
      </div>

      {/* PARTIE 2 - Dialogue (62%) */}
      <div className="h-[62%] relative min-h-0 bg-abyss-950/30">
        <DialogueArea messages={messages} myCharacter={myCharacter} />
      </div>

      {/* PARTIE 3 - Input de chat (6%) */}
      <div className="h-[6%] flex-shrink-0 bg-abyss-950/50">
        {inputState.enabled && (
          <motion.div
            className="w-[95%] max-w-[90vw] mx-auto h-full px-3 py-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChatInput
              ref={inputRef}
              draft={draft}
              setDraft={setDraft}
              inputState={inputState}
              onSend={handleSend}
            />
          </motion.div>
        )}
      </div>

      {/* PARTIE 4 - Vote (24%) */}
      <div className="h-[24%] flex-shrink-0 bg-abyss-950/50">
        <VoteArea
          turnOrder={turnOrder}
          currentTurnCharacter={currentTurnCharacter}
          myCharacter={myCharacter}
          roundPhase={roundPhase}
          hasVoted={hasVoted}
          votedFor={votedFor}
          currentManche={currentManche}
          onVote={handleVote}
        />
      </div>

      {/* Scoreboard entre les manches */}
      {roundResults && roomStatus === 'transition' && !endGameData && (
        <ScoreboardModal
          aiCharacter={aiCharacter}
          results={roundResults}
          countdown={countdown}
          debriefWait={debriefWait}
        />
      )}

      {/* Fin de partie normale : classement + debriefing */}
      {endGameData && (
        <GameEndModal
          winnerId={endGameData.winnerId}
          ranking={endGameData.ranking}
          history={endGameData.history}
          onReplay={handleReplay}
        />
      )}

      {/* Fermeture anormale de la room (quorum perdu, room vide...) */}
      {!endGameData && roomClosedCode && (
        <RoomClosedModal code={roomClosedCode} onReplay={handleReplay} />
      )}
    </div>
  );
}
