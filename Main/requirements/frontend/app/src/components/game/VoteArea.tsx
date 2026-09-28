// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { getBodyImagePath, getCharacterFluoColor } from '../../utils/characters';

type VoteAreaProps = {
  turnOrder: string[];
  currentTurnCharacter: string | null;
  myCharacter: string | null;
  roundPhase: string | null;
  hasVoted: boolean;
  // Cibles de vote deconnectees ou parties : jamais des cibles honnetes.
  disconnectedCharacters: string[];
  leftCharacters: string[];
  onVote?: (character: string) => void;
};

export function VoteArea({
  turnOrder,
  currentTurnCharacter,
  myCharacter,
  roundPhase,
  hasVoted,
  disconnectedCharacters,
  leftCharacters,
  onVote,
}: VoteAreaProps) {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  const isVotingPhase = roundPhase === 'voting';
  // Le backend collecte les votes en temps reel pendant la phase de
  // discussion : il n'existe pas de phase 'voting' distincte, on peut voter
  // des que la manche est en cours. Un vote deja depose (y compris restaure
  // par l'instantane de reprise) verrouille la zone.
  const canVote = (roundPhase === 'voting' || roundPhase === 'chatting') && !hasVoted;

  // Calcule la largeur relative pour chaque personnage
  function getCharacterWidth(numCharacters: number): string {
    return `${100 / numCharacters}%`;
  }

  function handleVote(character: string) {
    if (!canVote) return;
    if (character === myCharacter) return; // Ne peut pas voter pour soi
    
    if (selectedVote === character) {
      setSelectedVote(null);
    } else {
      setSelectedVote(character);
    }
  }

  function confirmVote() {
    if (selectedVote && onVote) {
      onVote(selectedVote);
      setSelectedVote(null);
    }
  }

  return (
    <motion.footer
      className="flex-shrink-0 p-6 bg-stone-900 border-t border-stone-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="max-w-5xl mx-auto w-full">
        {/* Indication du tour */}
        <motion.div
          className="mb-4 text-center"
          animate={{
            opacity: [1, 0.7, 1] 
          }}
          transition={{
            duration: 2, 
            repeat: Infinity 
          }}
        >
          {hasVoted ? (
            <span className="text-xl font-bold text-emerald-400">
              VOTE ENREGISTRÉ — en attente de la fin de manche
            </span>
          ) : (
            <span className="text-xl font-bold text-amber-400">
              {isVotingPhase
                ? 'PHASE DE VOTE - Cliquez pour éliminer'
                : `TOUR DE : ${currentTurnCharacter || 'Personne'}`}
            </span>
          )}
        </motion.div>

        {/* Personnages */}
        <div className="flex justify-center items-center gap-6 mb-6">
          {turnOrder.map((character) => {
            const isMe = character === myCharacter;
            const isCurrent = character === currentTurnCharacter;
            const isSelected = selectedVote === character;
            // Un joueur deconnecte ou parti est forcement humain : le bot
            // n'a pas de socket et ne part jamais. Voter pour lui serait une
            // defaite certaine, on ne laisse pas le piege ouvert.
            const isAbsent =
              disconnectedCharacters.includes(character) ||
              leftCharacters.includes(character);
            const isVotable = canVote && !isMe && !isAbsent;
            const bgColor = getCharacterFluoColor(character);
            const charWidth = getCharacterWidth(turnOrder.length);

            return (
              <motion.button
                key={character}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${bgColor} ${
                  isMe
                    ? 'ring-2 ring-yellow-500'
                    : isVotable
                      ? `cursor-pointer hover:brightness-150 hover:scale-105 ${isSelected ? 'ring-2 ring-white' : ''}`
                      : 'cursor-not-allowed'
                } ${isAbsent ? 'grayscale opacity-40' : ''}`}
                style={{ width: charWidth, minWidth: charWidth }}
                onClick={() => handleVote(character)}
                disabled={!isVotable}
                whileHover={{ scale: isVotable ? 1.05 : 1 }}
                whileTap={{ scale: isVotable ? 0.95 : 1 }}
                animate={{
                  boxShadow: isCurrent 
                    ? ['0 0 0 0 rgba(245, 158, 11, 0.4)', '0 0 0 15px rgba(245, 158, 11, 0)', '0 0 0 0 rgba(245, 158, 11, 0.4)']
                    : '0 0 0 0 rgba(0,0,0,0)'
                }}
                transition={{
                  duration: 1.5, 
                  repeat: Infinity 
                }}
              >
                {/* Image du personnage - par dessus la couleur */}
                <div className="w-full h-auto aspect-square relative">
                  <img
                    src={getBodyImagePath(character)}
                    alt={character}
                    className="w-full h-full object-cover drop-shadow-lg"
                  />
                </div>
                
                {/* Nom */}
                <div className={`text-sm font-semibold ${
                  isMe ? 'text-yellow-400' : 'text-stone-300'
                }`}>
                  {character}
                </div>
                
                {/* Indicateur "TOI" */}
                {isMe && (
                  <div className="absolute -top-3 -right-3 bg-yellow-500 text-yellow-900 text-[11px] font-bold px-2 py-1 rounded-full">
                    TOI
                  </div>
                )}
                
                {/* Indicateur selection */}
                {isSelected && (
                  <div className="absolute inset-0 bg-white/10 rounded-xl" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Bouton de confirmation de vote */}
        <AnimatePresence>
          {canVote && selectedVote && (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <motion.button
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-lg text-lg transition-colors"
                onClick={confirmVote}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ❌ VOTER POUR {selectedVote}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.footer>
  );
}
