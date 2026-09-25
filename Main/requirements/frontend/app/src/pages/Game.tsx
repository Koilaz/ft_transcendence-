// @ts-nocheck
import { motion } from 'framer-motion';
import { useGame } from '../hooks/useGame';
import {
  GameHeaderNew,
  DialogueArea,
  VoteArea,
} from '../components/game';

export default function Game() {
  const {
    roomNumber,
    roundPhase,
    turnOrder,
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
  } = useGame();

  // Fonction pour gérer le vote (à connecter au backend plus tard)
  function handleVote(character: string) {
    console.log('Vote pour:', character);
    // TODO: Envoyer le vote via WebSocket
  }

  return (
    <div className="fixed inset-0 bg-stone-950 text-stone-200 flex flex-col w-full overflow-hidden">
      {/* PARTIE 1 - Header (fixe en haut) */}
      <div className="flex-shrink-0">
        <GameHeaderNew
          roomNumber={roomNumber}
          roundIndicator={roundIndicator}
          countdown={countdown}
          timerLabel={timerLabel}
          timerVisible={timerVisible}
        />
      </div>

      {/* PARTIE 2 - Dialogue (prend l'espace disponible) */}
      <div className="flex-1 overflow-hidden min-h-0">
        <DialogueArea
          messages={messages}
          myCharacter={myCharacter}
        />
      </div>

      {/* PARTIE 2.5 - Input de chat (fixe au-dessus de VoteArea) */}
      {inputState.enabled && (
        <div className="flex-shrink-0 p-4">
          <motion.div
            className="w-[90%] max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex gap-3 bg-stone-800/90 backdrop-blur-sm border border-stone-700 rounded-xl p-3">
              <input
                ref={inputRef}
                className={`flex-1 bg-stone-900/50 border rounded-lg px-5 py-3 text-stone-200 text-lg transition-colors focus:outline-none ${
                  inputState.myTurn ? 'border-green-500 ring-2 ring-green-500' : 'border-stone-700'
                }`}
                value={draft}
                disabled={!inputState.enabled}
                placeholder={inputState.placeholder}
                autoComplete="off"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <motion.button
                type="button"
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-6 py-3 font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!inputState.enabled || !draft.trim()}
                onClick={handleSend}
                whileHover={{ scale: inputState.enabled ? 1.02 : 1 }}
                whileTap={{ scale: inputState.enabled ? 0.98 : 1 }}
              >
                Envoyer
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PARTIE 3 - Vote (fixe en bas) */}
      <div className="flex-shrink-0">
        <VoteArea
          turnOrder={turnOrder}
          currentTurnCharacter={currentTurnCharacter}
          myCharacter={myCharacter}
          roundPhase={roundPhase}
          onVote={handleVote}
        />
      </div>
    </div>
  );
}
