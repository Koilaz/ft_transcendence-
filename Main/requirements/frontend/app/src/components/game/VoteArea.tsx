// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { getBodyImagePath, getCharacterFluoColor } from '../../utils/characters';

// ============================================
// TYPES
// ============================================
type VoteAreaProps = {
  turnOrder: string[];              // Liste des personnages dans l'ordre du tour
  currentTurnCharacter: string | null;  // Personnage dont c'est le tour
  myCharacter: string | null;     // Mon personnage
  roundPhase: string | null;      // Phase actuelle : 'chatting', 'voting', etc.
  hasVoted: boolean;                // True si j'ai déjà voté
  disconnectedCharacters: string[]; // Personnages déconnectés (ne pas voter pour eux)
  leftCharacters: string[];        // Personnages partis de la room (ne pas voter pour eux)
  onVote?: (character: string) => void;  // Callback pour envoyer le vote
};

// ============================================
// COMPOSANT : VoteArea
// Gère l'affichage et l'interaction de la zone de vote (PARTIE 4)
// ============================================
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
  // --- ETAT LOCAL ---
  const [selectedVote, setSelectedVote] = useState<string | null>(null); // Personnage sélectionné pour le vote

  // --- LOGIQUE DE VOTE ---
  const isVotingPhase = roundPhase === 'voting';
  // Le backend collecte les votes en temps reel pendant la phase de
  // discussion : il n'existe pas de phase 'voting' distincte, on peut voter
  // des que la manche est en cours. Un vote deja depose (y compris restaure
  // par l'instantane de reprise) verrouille la zone.
  const canVote = (roundPhase === 'voting' || roundPhase === 'chatting') && !hasVoted; // Peut-on voter ?



  // --- GESTION DES INTERACTIONS ---
  function handleVote(character: string) {
    if (!canVote) return; // Bloque si on ne peut pas voter
    if (character === myCharacter) return; // Ne peut pas voter pour soi
    
    // Toggle : sélectionne/désélectionne le personnage
    if (selectedVote === character) {
      setSelectedVote(null);
    } else {
      setSelectedVote(character);
    }
  }

  function confirmVote() {
    if (selectedVote && onVote) {
      onVote(selectedVote);  // Envoie le vote au parent
      setSelectedVote(null); // Réinitialise la sélection
    }
  }

  // ============================================
  // RENDU
  // ============================================
  return (
    // Conteneur principal - prendre toute la hauteur disponible
    <motion.footer
      className="h-full w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="h-full w-full flex flex-col">
        
        {/* ==========================================
             SECTION 1 : NOMS DES PERSONNAGES
             Affiche le nom de chaque personnage au-dessus de son bouton
        ========================================== */}
        <div className="h-[10%] flex justify-evenly items-end text-center pb-2">
          {turnOrder.map((character) => {
            const isMe = character === myCharacter;
            return (
              <div
                key={character}
                className="flex-1 flex justify-center"
                style={{ maxWidth: `calc(100% / ${turnOrder.length})` }}
              >
                <div
                  className={`rounded-lg px-3 py-1 ${
                    isMe
                      ? 'bg-yellow-500/90 text-yellow-900 font-bold border-2 border-yellow-600'
                      : 'bg-white/70 text-black font-bold'
                  }`}
                >
                  <span className="text-[clamp(0.875rem,1.5vw,1.125rem)]">
                    {character}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ==========================================
             SECTION 2 : LISTE DES PERSONNAGES
             Boutons cliquables pour sélectionner un personnage
        ========================================== */}
        <div className="flex-1 flex justify-evenly items-center overflow-hidden w-full">
          {turnOrder.map((character) => {
            // --- ETATS DU PERSONNAGE ---
            const isMe = character === myCharacter;           // C'est moi ?
            const isCurrent = character === currentTurnCharacter;  // C'est son tour ?
            const isSelected = selectedVote === character; // Sélectionné pour le vote ?
            // Un joueur deconnecte ou parti est forcement humain : le bot
            // n'a pas de socket et ne part jamais. Voter pour lui serait une
            // defaite certaine, on ne laisse pas le piege ouvert.
            const isAbsent =
              disconnectedCharacters.includes(character) ||
              leftCharacters.includes(character);
            const isVotable = canVote && !isMe && !isAbsent;  // Peut-on voter pour ce personnage ?
            const bgColor = getCharacterFluoColor(character);  // Couleur fluo du personnage

            return (
              // Bouton personnage
              <motion.button
                key={character}
                // Styles : fond fluo, bordure selon l'état, ratio 1:2 pour les images body
                className={`relative flex flex-col items-center justify-start rounded-xl transition-all ${bgColor} overflow-hidden max-h-full aspect-[1/2] pb-2 flex-1 ${
                  isMe
                    ? 'ring-2 ring-yellow-500'          // Moi = bordure jaune
                    : isVotable
                      ? `cursor-pointer hover:brightness-150 ${isSelected ? 'ring-2 ring-white' : ''}`  // Votable = survol brillant
                      : 'cursor-not-allowed'             // Non votable = curseur interdit
                } ${isAbsent ? 'grayscale opacity-40' : ''} ${isCurrent ? 'ring-2 ring-amber-400' : ''}`}  // Tour actuel = bordure ambrée
                style={{ maxWidth: `calc(100% / ${turnOrder.length})` }}
                onClick={() => handleVote(character)}
                disabled={!isVotable}
              >
                {/* Image du personnage - affiche toute l'image (tête + pieds) */}
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={getBodyImagePath(character)}
                    alt={character}
                    className="max-w-full max-h-full object-contain drop-shadow-lg"
                  />
                </div>
                
                {/* Texte indicateur de tour - effet manga sur le personnage actuel */}
                {isCurrent && (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const angle = (i / 6) * Math.PI * 2;
                      const startRadius = 0;
                      const endRadius = 150;
                      const startX = Math.cos(angle) * startRadius;
                      const startY = Math.sin(angle) * startRadius;
                      const endX = Math.cos(angle) * endRadius;
                      const endY = Math.sin(angle) * endRadius;
                      return (
                        <motion.div
                          key={i}
                          className="absolute text-red-500 text-[clamp(1rem,2vw,1.5rem)] font-bold pointer-events-none"
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                          initial={{ x: startX, y: startY, opacity: 1, scale: 1.2 }}
                          animate={{ x: endX, y: endY, opacity: 0, scale: 0.8 }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            delay: i * 0.2,
                            ease: "easeOut" 
                          }}
                        >
                          bla
                        </motion.div>
                      );
                    })}
                  </>
                )}
                
                {/* Surbrillance de sélection */}
                {isSelected && (
                  <div className="absolute inset-0 bg-white/10 rounded-xl" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ==========================================
             SECTION 3 : BOUTON DE CONFIRMATION / VOTE ENREGISTRÉ
             Apparaît quand un personnage est sélectionné ou après avoir voté
        ========================================== */}
        <AnimatePresence>
          {hasVoted ? (
            // Message de confirmation quand le vote est enregistré
            <motion.div
              className="flex justify-center p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <span className="text-[clamp(1rem,2vw,1.5rem)] font-bold text-emerald-400">
                VOTE ENREGISTRÉ — en attente de la fin de manche
              </span>
            </motion.div>
          ) : canVote && selectedVote && (
            <motion.div
              className="flex justify-center p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <motion.button
                className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-[clamp(0.875rem,1.75vw,1.125rem)] transition-colors"
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
