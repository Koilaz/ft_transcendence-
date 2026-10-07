// @ts-nocheck
import { motion } from 'framer-motion';
import { useGame } from '../hooks/useGame';
import {
  GameHeader,
  DialogueArea,
  VoteArea,
  ChatInput,
} from '../components/game';
import { ScoreboardModal, GameEndModal, RoomClosedModal } from './VoteSystem';
import { Lobby } from './Lobby';

export default function Game() {
  const {
    connectionOpen,
    roomNumber,
    roundPhase,
    turnOrder,
    turnCycle,
    currentTurnCharacter,
    myCharacter,
    countdown,
    messages,
    timerVisible,
    timerLabel,
    roundIndicator,
    draft,
    setDraft,
    inputState,
    feedRef,
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
    disconnectedCharacters,
    leftCharacters,
    waitingPlayers,
    minPlayers,
    readyPlayers,
    isReady,
    agentsDown,
    handleReady,
  } = useGame();

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
    <div className="fixed inset-0 bg-stone-950 flex flex-col w-full overflow-hidden">
      {/* PARTIE 1 - Header (10%) */}
      <div className="h-[10%] flex-shrink-0">
        <GameHeader
          roomNumber={roomNumber}
          roundIndicator={roundIndicator}
          turnCycle={turnCycle}
          countdown={countdown}
          timerLabel={timerLabel}
          timerVisible={timerVisible}
          characters={turnOrder}
        />
      </div>

      {/* PARTIE 2 - Dialogue (62.5%) */}
      <div className="h-[62.5%] overflow-hidden min-h-0 text-black">
        <DialogueArea
          messages={messages}
          myCharacter={myCharacter}
        />
      </div>

      {/* PARTIE 3 - Input de chat (6.25%) */}
      <div className="h-[6.25%] flex-shrink-0 bg-orange-300">
        {inputState.enabled && (
          <motion.div
            className="w-[95%] max-w-[90vw] mx-auto h-full p-2"
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

      {/* PARTIE 4 - Vote (21.25%) */}
      <div className="h-[21.25%] flex-shrink-0 bg-orange-300">
        <VoteArea
          turnOrder={turnOrder}
          currentTurnCharacter={currentTurnCharacter}
          myCharacter={myCharacter}
          roundPhase={roundPhase}
          hasVoted={hasVoted}
          disconnectedCharacters={disconnectedCharacters}
          leftCharacters={leftCharacters}
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
