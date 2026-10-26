import { motion } from 'framer-motion';
import { useState } from 'react';
import { getBodyImagePath, getCharacterColor, getCharacterBorder } from '../../utils/characters';
import { Badge } from '../ui';

// ============================================
// TYPES
// ============================================
type VoteAreaProps = {
  turnOrder: string[];              // Liste des personnages dans l'ordre du tour
  currentTurnCharacter: string | null;  // Personnage dont c'est le tour
  myCharacter: string | null;     // Mon personnage
  roundPhase: string | null;      // Phase actuelle : 'chatting', 'voting', etc.
  hasVoted: boolean;                // True si j'ai déjà voté
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
  onVote,
}: VoteAreaProps) {
  // --- ETAT LOCAL ---
  const [selectedVote, setSelectedVote] = useState<string | null>(null); // Personnage sélectionné pour le vote
  const [votedFor, setVotedFor] = useState<string | null>(null); // Personnage pour qui on a voté

  // --- LOGIQUE DE VOTE ---
  // Le backend collecte les votes en temps reel pendant la phase de
  // discussion : il n'existe pas de phase 'voting' distincte, on peut voter
  // des que la manche est en cours. Un vote deja depose (y compris restaure
  // par l'instantane de reprise) verrouille la zone.
  const canVote = (roundPhase === 'voting' || roundPhase === 'chatting') && !hasVoted; // Peut-on voter ?



  // --- GESTION DES INTERACTIONS ---
  function handleVote(character: string) {
    if (!canVote) return; // Bloque si on ne peut pas voter
    if (character === myCharacter) return; // Ne peut pas voter pour soi

    // Reclic sur le même personnage → confirme le vote
    if (selectedVote === character) {
      if (onVote) onVote(character);
      setVotedFor(character);
      setSelectedVote(null);
    } else {
      // Premier clic → sélectionne
      setSelectedVote(character);
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
            return (
              <div
                key={character}
                className="flex-1 flex justify-center"
                style={{ maxWidth: `calc(100% / ${turnOrder.length})` }}
              >
                <div
                  className="rounded-lg px-3 py-1 bg-stone-900/80 text-white font-bold border-2 border-blue-500"
                >
                  <span className="font-bangers text-[clamp(0.875rem,1.5vw,1.125rem)]">
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
            const isVotedFor = votedFor === character;    // Personnage pour qui on a voté ?
            const isVotable = canVote && !isMe;  // Peut-on voter pour ce personnage ?
            const bgColor = getCharacterColor(character);  // Couleur normale du personnage
            const borderColor = getCharacterBorder(character);  // Bordure foncée du personnage

            return (
              // Bouton personnage
              <motion.button
                key={character}
                // Styles : fond normal, bordure selon l'état, ratio 1:2 pour les images body
                className={`group relative flex flex-col items-center justify-start rounded-xl transition-all border-2 ${bgColor} ${borderColor} overflow-hidden max-h-full aspect-[1/2] pb-2 flex-1 ${
                  isVotable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
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
                      const endRadius = 180;
                      const startX = Math.cos(angle) * startRadius;
                      const startY = Math.sin(angle) * startRadius;
                      const endX = Math.cos(angle) * endRadius;
                      const endY = Math.sin(angle) * endRadius;
                      return (
                        <motion.div
                          key={i}
                          className="absolute text-red-500 text-[clamp(0.75rem,1.2vw,1rem)] font-bold pointer-events-none font-bangers"
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}
                          initial={{ x: startX, y: startY, opacity: 0, scale: 1.2 }}
                          animate={{ x: endX, y: endY, opacity: [0, 1, 1, 0], scale: [1.2, 3.8, 3.8, 1.2] }}
                          transition={{
                            duration: 1.8, 
                            repeat: Infinity, 
                            delay: i * 0.2,
                            ease: "easeOut",
                            times: [0, 0.1, 0.7, 1]
                          }}
                        >
                          bla
                        </motion.div>
                      );
                    })}
                  </>
                )}
                
                {/* Badge au survol ou sélectionné */}
                {isVotable && (
                  <div className={`absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-1 pointer-events-none transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <Badge color="red">
                      {isSelected ? 'CONFIRMER VOTE' : 'VOTER POUR LUI'}
                    </Badge>
                  </div>
                )}

                {/* Badge vert quand le vote est enregistré sur ce personnage */}
                {isVotedFor && (
                  <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-1 pointer-events-none">
                    <Badge color="green">VOTE ENREGISTRÉ</Badge>
                  </div>
                )}

                {/* Badge pour mon personnage */}
                {isMe && (
                  <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-1 pointer-events-none">
                    <Badge color="blue">C'EST TOI</Badge>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

      </div>
    </motion.footer>
  );
}
