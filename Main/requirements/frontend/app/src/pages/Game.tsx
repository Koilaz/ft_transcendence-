// @ts-nocheck
import { motion } from 'framer-motion';
import { useGame } from '../hooks/useGame';
import {
  GameHeaderNew,
  DialogueArea,
  VoteArea,
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
        <GameHeaderNew
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
      <div className="h-[6.25%] flex-shrink-0">
        {inputState.enabled && (
          <motion.div
            className="w-[95%] max-w-[90vw] mx-auto h-full p-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex gap-3 bg-stone-800/90 backdrop-blur-sm border border-stone-700 rounded-xl p-3 h-full">
              <input
                ref={inputRef}
                className={`flex-1 bg-stone-900/50 border rounded-lg px-5 py-2 text-stone-200 text-lg transition-colors focus:outline-none ${
                  inputState.myTurn ? 'border-green-500 ring-2 ring-green-500' : 'border-stone-700'
                }`}
                value={draft}
                disabled={!inputState.enabled}
                placeholder={inputState.placeholder}
                autoComplete="off"
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <motion.button
                type="button"
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!inputState.enabled || !draft.trim()}
                onClick={handleSend}
                whileHover={{ scale: inputState.enabled ? 1.02 : 1 }}
                whileTap={{ scale: inputState.enabled ? 0.98 : 1 }}
              >
                Envoyer
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* PARTIE 4 - Vote (21.25%) */}
      <div className="h-[21.25%] flex-shrink-0">
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
