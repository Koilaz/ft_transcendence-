// @ts-nocheck
// ============================================
// IMPORTS
// ============================================
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import type { FeedMessage } from '../../types/game';
import { getHeadImagePath, getCharacterFluoColor } from '../../utils/characters';

// ============================================
// HOOK : Détecte la taille d'écran (responsive)
// ============================================
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);
  return matches;
}

// ============================================
// TYPES
// ============================================
type DialogueBubbleProps = {
  sender: string;      // Nom du personnage qui envoie le message
  text: string;        // Contenu du message
  isSystem?: boolean;  // True = message système (centré)
  align: 'left' | 'right'; // Alignement de la bulle
  index: number;       // Index pour les animations
};

// ============================================
// COMPOSANT : DialogueBubble
// Affiche une bulle de dialogue individuelle
// ============================================
function DialogueBubble({ sender, text, isSystem, align, index }: DialogueBubbleProps) {
  // --- MESSAGES SYSTEME (centrés, style différent) ---
  if (isSystem) {
    return (
      <motion.div
        className="flex justify-center my-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        {/* Style des messages système : fond stone-800, texte stone-400 */}
        <div className="text-base text-stone-400 italic bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 max-w-[85%]">
          {text}
        </div>
      </motion.div>
    );
  }

  // --- MESSAGES DES PERSONNAGES ---
  const isLeft = align === 'left';
  const fluoColor = getCharacterFluoColor(sender);  // Couleur fluo associée au personnage
  
  // Mapping des couleurs Tailwind vers hex pour le gradient soleil
  const getFluoHex = (colorClass: string) => {
    const map: Record<string, string> = {
      'bg-cyan-500': '#06b6d4', 'bg-cyan-400': '#22d3ee', 'bg-cyan-600': '#0891b2',
      'bg-pink-500': '#ec4899', 'bg-pink-400': '#f472b6', 'bg-pink-600': '#db2777',
      'bg-rose-500': '#f43f5e', 'bg-rose-400': '#f87171', 'bg-rose-600': '#e11d48',
      'bg-lime-500': '#84cc16', 'bg-lime-400': '#a3e635', 'bg-lime-600': '#65a30d',
      'bg-orange-500': '#ea580c', 'bg-orange-400': '#fb923c', 'bg-orange-600': '#c2410c',
      'bg-purple-500': '#a855f7', 'bg-purple-400': '#c084fc', 'bg-purple-600': '#7c3aed',
      'bg-yellow-500': '#eab308', 'bg-yellow-400': '#fbbf24', 'bg-yellow-600': '#ca8a04',
      'bg-emerald-500': '#10b981', 'bg-emerald-400': '#34d399', 'bg-emerald-600': '#059669',
      'bg-teal-500': '#14b8a6', 'bg-teal-400': '#5eead4', 'bg-teal-600': '#0d9488',
      'bg-green-500': '#22c55e', 'bg-green-400': '#4ade80', 'bg-green-600': '#16a34a',
    };
    return map[colorClass] || '#ffffff';
  };
  
  const hexColor = getFluoHex(fluoColor);
  
  // Génère le gradient soleil sur 360° partant du BAS, centre à 75% de hauteur
  const sunGradient = `repeating-conic-gradient(
    from -90deg at 50% 75%,
    #ffffff 0deg 5deg,
    #fb923c 5deg 10deg
  )`;
  
  return (
    <motion.div
      className={`flex items-start gap-3 my-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'} p-2 rounded-2xl ${fluoColor}`}
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      {/* ==================================
           PORTRAIT - EFFET SOLEIL OPTION 3
           8 rayons épais avec dégradé de couleur
      ================================== */}
      <motion.div
        className="flex-shrink-0 aspect-square rounded-lg overflow-hidden relative"
        style={{ width: 'clamp(60px, 20%, 150px)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        {/* Rayons BLANC + ORANGE - 180° partant du BAS */}
        <div
          className="absolute inset-0"
          style={{
            background: sunGradient,
            opacity: 0.6,
          }}
        />
        <img
          src={getHeadImagePath(sender)}
          alt={sender}
          className="relative w-full h-full object-cover rounded-lg border-2 border-white/50"
        />
      </motion.div>
      
      {/* ==================================
           BULLE DE TEXTE
      ================================== */}
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 relative ${fluoColor}/50 ${
          isLeft 
            ? 'rounded-bl-sm' 
            : 'rounded-br-sm text-right'
        }`}
      >
        {/* Pointe de la bulle (triangle) */}
        <div
          className={`absolute top-6 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] ${
            isLeft ? 'left-[-12px]' : 'right-[-12px]'
          } ${fluoColor.replace(/^bg-/, 'border-b-')}/50`}
        />
        
        {/* NOM DU PERSONNAGE */}
        <div className={`text-sm font-bold text-black mb-2 ${!isLeft ? 'text-right' : ''}`}>
          <span className={`${fluoColor}/30 px-2 py-1 rounded`}>
            {sender}
          </span>
        </div>
        
        {/* TEXTE DU MESSAGE */}
        <div className="text-base text-black leading-[1.5] backdrop-blur-sm bg-white/20 rounded-full px-4 py-1 inline-block">
          {text}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// TYPES
// ============================================

// ============================================
// COMPOSANT PRINCIPAL : DialogueArea
// Gère l'affichage de la zone de dialogue (PARTIE 2)
// ============================================
export function DialogueArea({ messages, myCharacter }: DialogueAreaProps) {
  // ============================================
  // RESPONSIVE : Détecte si mobile
  // ============================================
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // ============================================
  // ARRIERE-PLAN : Mots en blanc
  // A MODIFIER : Liste des mots à afficher
  // ============================================
  const backgroundWords = [
    "Hello", "Salut", "Hey", "Yo", "Hi", "Bonjour", "Coucou", "Allô",
    "Chat", "Talk", "Welcome", "Bienvenue", "Discuss", "Hey"
  ];

  // ============================================
  // A MODIFIER : Map des fonts par personnage
  // Exemple : const fontMap = { 'Alice': 'font-pacifico', 'Bob': 'font-roboto' }
  // À décommenter et compléter avec TES personnages et LEURS fonts
  // ============================================
  // const fontMap: Record<string, string> = {
  //   'Alice': 'font-alice',
  //   'Bob': 'font-bob',
  //   'Charlie': 'font-charlie',
  //   // ... ajoute TOUS tes personnages ici
  // };

  // ============================================
  // Génère les mots - ADAPTE AUX TAILLES D'ECRAN
  // 👇 NE PAS TOUCHER : useMemo évite le clignotement
  // ============================================
  const wordElements = useMemo(() => {
    // Nombre de mots : 15 sur mobile, 50 sur desktop
    const wordCount = isMobile ? 15 : 50;
    
    // Répète le tableau pour avoir assez de mots
    const words = [...Array(wordCount)].map(
      (_, i) => backgroundWords[i % backgroundWords.length]
    );
    
    return words.map((word, i) => {
      // Sélectionne un personnage aléatoirement pour la font (sera remplacé par fontMap)
      const randomSender = messages[Math.floor(Math.random() * messages.length)]?.sender || '';
      
      return (
        <span
          key={i}
          // 👇 À DECOMMENTER quand fontMap est prêt
          // className={`absolute text-white/20 ${fontMap[randomSender] || 'font-sans'}`}
          className="absolute text-white/20 font-sans"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            // 👇 Taille adaptive : 12-20px sur mobile, 14-32px sur desktop
            fontSize: `${isMobile ? 12 + Math.random() * 8 : 14 + Math.random() * 16}px`,
            // 👇 Rotation aléatoire pour un effet naturel
            transform: `rotate(${Math.random() * 20 - 10}deg)`,
          }}
        >
          {word}
        </span>
      );
    });
  }, [isMobile]); // 👈 Recalcule si la taille d'écran change

  // ============================================
  // RENDU PRINCIPAL
  // ============================================
  return (
    /* Conteneur principal - PARTIE 2 du jeu */
    <motion.main
      className="h-full w-full overflow-hidden px-4 pt-4 pb-0 relative bg-orange-300"  // 👇 FOND : Modifier ici pour changer la couleur
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* ============================================
           ARRIERE-PLAN : Mots en blanc (20% opacité)
           A MODIFIER : 
           - backgroundWords (liste des mots)
           - fontMap (font par personnage)
           - fontSize/rotation dans wordElements
      ============================================ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {wordElements}
      </div>

      {/* ============================================
           CONTENEUR DES MESSAGES
           A MODIFIER : 
           - Le filtre (message.kind === 'chat')
           - L'alignement (index % 2 === 0)
      ============================================ */}
      <div className="relative w-full h-full flex flex-col justify-end overflow-y-auto">
        {messages
          .filter(message => message.kind === 'chat')  // 👇 Garde uniquement les messages de type 'chat'
          .map((message, index) => {
            const align = index % 2 === 0 ? 'left' : 'right';  // 👇 Alternance gauche/droite
            return (
              <DialogueBubble
                key={message.id}
                sender={message.sender}
                text={message.text}
                align={align}
                index={index}
              />
            );
          })}
      </div>
    </motion.main>
  );
}
