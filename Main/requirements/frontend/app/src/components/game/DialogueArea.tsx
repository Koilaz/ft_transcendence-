// ============================================
// IMPORTS
// ============================================
import { useState, useEffect } from 'react';
import { getHeadImagePath, getCharacterFluoColor, getCharacterDialogueColor } from '../../utils/characters';
import { getCharacterFont } from '../../utils/fonts';

// ============================================
// COMPOSANT : AnimatedMayoPortrait (pour les dialogues)
// Affiche Lieutenant Mayo avec animation : normal → yeux fermés → clin d'œil → sourire
// ============================================
function AnimatedMayoPortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/headLieutenantMayo.webp',
    '/headLieutenantMayoClosedEyes.webp',
    '/headLieutenantMayo.webp',
    '/headLieutenantMayoWink.webp',
    '/headLieutenantMayo.webp',
    '/headLieutenantMayoSmile.webp',
  ];

  // Séquence avec timings personnalisés (en ms)
  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },        // Normal (0s)
      { delay: 2000, index: 1 },     // Yeux fermés (2s)
      { delay: 2200, index: 2 },     // Normal (2.2s)
      { delay: 3200, index: 3 },     // Clin d'œil (3.2s)
      { delay: 3700, index: 4 },     // Normal (3.7s)
      { delay: 4700, index: 5 },     // Sourire (4.7s)
    ];

    // Démarre la séquence
    sequence.forEach((step) => {
      setTimeout(() => {
        setCurrentIndex(step.index);
      }, step.delay);
    });

    // Boucle la séquence
    const totalDuration = 4700 + 2500; // 4.7s + 2.5s (sourire) = 7.2s
    const loopInterval = setInterval(() => {
      setCurrentIndex(0); // Réinitialise à normal
      sequence.forEach((step) => {
        setTimeout(() => {
          setCurrentIndex(step.index);
        }, step.delay);
      });
    }, totalDuration);

    return () => clearInterval(loopInterval);
  }, []);

  return (
    <img
      src={images[currentIndex]}
      alt="Lieutenant Mayo"
      className={className}
    />
  );
}

// ============================================
// COMPOSANT : AnimatedWasabiPortrait (pour les dialogues)
// Animation de pleurs : petites larmes → fontaine de pleurs → petites larmes
// ============================================
function AnimatedWasabiPortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0); // Commence par petites larmes
  const images = [
    '/headMajorWasabiTears.webp',   // Petites larmes (état principal)
    '/headMajorWasabiCrying.webp',  // Fontaine de pleurs (pic émotionnel)
    '/headMajorWasabiCryingEnd.webp', // Fin de la fontaine (transition discrète)
    '/headMajorWasabi.webp',        // Normal (transition discrète)
  ];

  // Séquence : petites larmes → fontaine → petites larmes → fontaine
  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },       // Petites larmes (départ)
      { delay: 3000, index: 1 },     // Fontaine après 4s
      { delay: 5000, index: 2 },     // Fin de la fontaine après 1.5s
      { delay: 5100, index: 3 },     // Normal après 0.5s
      { delay: 5200, index: 0 },     // Nouvelle fontaine après 2.5s
    ];

    // Démarre la séquence
    sequence.forEach((step) => {
      setTimeout(() => {
        setCurrentIndex(step.index);
      }, step.delay);
    });

    // Boucle (6.8s total)
    const loopInterval = setInterval(() => {
      setCurrentIndex(0); // Recommence par petites larmes
      sequence.forEach((step) => {
        setTimeout(() => {
          setCurrentIndex(step.index);
        }, step.delay);
      });
    }, 5200);

    return () => clearInterval(loopInterval);
  }, []);

  return (
    <img
      src={images[currentIndex]}
      alt="Major Wasabi"
      className={className}
    />
  );
}

// ============================================
// COMPOSANT : AnimatedKetchupPortrait (STYLE MANGA)
// ============================================
function AnimatedKetchupPortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAngerLines, setShowAngerLines] = useState(false);

  const images = [
    '/headGeneralKetchup.webp',
    '/headGeneralKetchupSlightAngry.webp',
    '/headGeneralKetchupAngry.webp',
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0, anger: false },
      { delay: 2000, index: 1, anger: false },
      { delay: 3000, index: 2, anger: true },
      { delay: 4500, index: 1, anger: false },
      { delay: 5000, index: 0, anger: false },
    ];

    sequence.forEach((step) => {
      setTimeout(() => {
        setCurrentIndex(step.index);
        setShowAngerLines(step.anger);
      }, step.delay);
    });

    const loopInterval = setInterval(() => {
      setCurrentIndex(0);
      setShowAngerLines(false);
      sequence.forEach((step) => {
        setTimeout(() => {
          setCurrentIndex(step.index);
          setShowAngerLines(step.anger);
        }, step.delay);
      });
    }, 6000);

    return () => clearInterval(loopInterval);
  }, []);

  return (
    <div
      className="relative"
    >
      {showAngerLines && (
        <>
          <div className="absolute -top-1 -left-1 w-4 h-0 border-t-2 border-l-2 border-transparent border-t-red-600 border-l-red-600 transform -rotate-45" />
          <div className="absolute -top-1 -right-1 w-4 h-0 border-t-2 border-r-2 border-transparent border-t-red-600 border-r-red-600 transform rotate-45" />
          <div className="absolute -bottom-1 -left-1 w-4 h-0 border-b-2 border-l-2 border-transparent border-b-red-600 border-l-red-600 transform rotate-45" />
          <div className="absolute -bottom-1 -right-1 w-4 h-0 border-b-2 border-r-2 border-transparent border-b-red-600 border-r-red-600 transform -rotate-45" />
          <div className="absolute -left-2 top-1/4 w-0 h-6 border-l-2 border-transparent border-l-red-600 transform -rotate-12" />
          <div className="absolute -right-2 top-1/4 w-0 h-6 border-r-2 border-transparent border-r-red-600 transform rotate-12" />
        </>
      )}
      <img
        src={images[currentIndex]}
        alt="General Ketchup"
        className={className}
      />
    </div>
  );
}

// ============================================
// COMPOSANT : AnimatedMoutardePortrait
// ============================================
function AnimatedMoutardePortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/headColonelMoutardeThinking.webp', // 0: Réflexion
    '/headColonelMoutarde.webp',          // 1: Normal (transition)
    '/headColonelMoutardeSweating.webp',  // 2: Transpiration
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },    // Thinking (3s)
      { delay: 3000, index: 1 },  // Normal (0.5s) → transition
      { delay: 3500, index: 2 },  // Sweating (2s)
      { delay: 5500, index: 1 },  // Normal (0.5s) → transition
      { delay: 6000, index: 0 },  // Thinking (1s) → boucle
    ];

    sequence.forEach((step) => {
      setTimeout(() => setCurrentIndex(step.index), step.delay);
    });

    const loopInterval = setInterval(() => {
      setCurrentIndex(0);
      sequence.forEach((step) => {
        setTimeout(() => setCurrentIndex(step.index), step.delay);
      });
    }, 6000);

    return () => clearInterval(loopInterval);
  }, []);

  return <img src={images[currentIndex]} alt="Colonel Moutarde" className={className} />;
}

// ============================================
// COMPOSANT : AnimatedPoivrePortrait (moustache qui bouge)
// ============================================
function AnimatedPoivrePortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/headCaporalPoivre.webp',             // 0: Normal
    '/headCaporalPoivreMustacheStraight.webp',    // 1: Straight (transition)
    '/headCaporalPoivreMustacheUp.webp',  // 2: Moustache levée
    '/headCaporalPoivreMustacheDown.webp',// 3: Moustache baissée
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },    // Normal (2s)
      { delay: 2000, index: 1 },  // Straight (0.2s)
      { delay: 2200, index: 2 },  // MustacheUp (0.15s)
      { delay: 2350, index: 3 },  // MustacheDown (0.15s)
      { delay: 2500, index: 1 },  // Straight (0.2s)
      { delay: 2700, index: 0 },  // Normal (1.3s)
    ];

    sequence.forEach((step) => {
      setTimeout(() => setCurrentIndex(step.index), step.delay);
    });

    const loopInterval = setInterval(() => {
      setCurrentIndex(0);
      sequence.forEach((step) => {
        setTimeout(() => setCurrentIndex(step.index), step.delay);
      });
    }, 4000);

    return () => clearInterval(loopInterval);
  }, []);

  return <img src={images[currentIndex]} alt="Caporal Poivre" className={className} />;
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
      <div
        className="flex justify-center my-2"
      >
        {/* Style des messages système : fond stone-800, texte stone-400 */}
        <div className="text-base text-stone-400 italic bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 max-w-[85%]">
          {text}
        </div>
      </div>
    );
  }

  // --- MESSAGES DES PERSONNAGES ---
  const isLeft = align === 'left';
  const fluoColor = getCharacterFluoColor(sender);
  const dialogueColor = getCharacterDialogueColor(sender);
  
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
  
  // Récupère la couleur hexadécimale du flou
  //const hexColor = getFluoHex(fluoColor); n'est plus utilise pour l'instant. a supprimer pour la version finale
  
  // Génère le gradient soleil sur 360° partant du BAS, centre à 75% de hauteur
  const sunGradient = `repeating-conic-gradient(
    from -90deg at 50% 75%,
    #ffffff 0deg 5deg,
    #fb923c 5deg 10deg
  )`;
  
  return (
    <div
      className={`flex items-start gap-3 my-2 pointer-events-auto ${isLeft ? 'flex-row' : 'flex-row-reverse'} p-2 rounded-2xl ${dialogueColor} relative`}
    >
      {/* Arrière-plan Particules */}
      {/* <ParticlesEffect 
        particleCount={200} 
        maxSize={8} 
        followSpeed={0.2}
        visibleFromStart={true}
        backgroundColor="transparent"
      /> */}
      
      {/* ==================================
           PORTRAIT - EFFET SOLEIL OPTION 3
           8 rayons épais avec dégradé de couleur
      ================================== */}
      <div
        className="flex-shrink-0 aspect-square rounded-lg overflow-hidden relative"
        style={{ width: 'clamp(60px, 20%, 150px)' }}
      >
        {/* Rayons BLANC + ORANGE - 180° partant du BAS */}
        <div
          className="absolute inset-0"
          style={{
            background: sunGradient,
            opacity: 0.6,
          }}
        />
        {sender === 'Lieutenant Mayo' ? (
          <AnimatedMayoPortrait className="relative w-full h-full object-cover rounded-lg border-2 border-white/50" />
        ) : sender === 'Major Wasabi' ? (
          <AnimatedWasabiPortrait className="relative w-full h-full object-cover rounded-lg border-2 border-white/50" />
        ) : sender === 'General Ketchup' ? (
          <AnimatedKetchupPortrait className="relative w-full h-full object-cover rounded-lg border-2 border-white/50" />
        ) : sender === 'Colonel Moutarde' ? (
          <AnimatedMoutardePortrait className="relative w-full h-full object-cover rounded-lg border-2 border-white/50" />
        ) : sender === 'Caporal Poivre' ? (
          <AnimatedPoivrePortrait className="relative w-full h-full object-cover rounded-lg border-2 border-white/50" />
        ) : (
          <img
            src={getHeadImagePath(sender)}
            alt={sender}
            className="relative w-full h-full object-cover rounded-lg border-2 border-white/50"
          />
        )}
      </div>
      
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
        
        {/* NOM DU PERSONNAGE - Police par personnage */}
        <div className={`text-sm font-bold text-black mb-2 ${!isLeft ? 'text-right' : ''}`}>
          <span className={`${fluoColor}/30 px-2 py-1 rounded ${getCharacterFont(sender)}`}>
            {sender}
          </span>
        </div>
        
        {/* TEXTE DU MESSAGE - Police par personnage */}
        <div className={`text-base text-white leading-[1.5] backdrop-blur-sm bg-black/50 rounded-full px-4 py-1 inline-block ${getCharacterFont(sender)}`}>
          {text}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TYPES
// ============================================
type DialogueAreaProps = {
  messages: Array<{
    id: string;
    kind: string;
    sender: string;
    text: string;
  }>;
  myCharacter: string | null;
};

// ============================================
// COMPOSANT PRINCIPAL : DialogueArea
// Gère l'affichage de la zone de dialogue (PARTIE 2)
// ============================================
export function DialogueArea({ messages, myCharacter }: DialogueAreaProps) {
  return (
    <main
      className="h-full w-full overflow-hidden px-4 pt-4 pb-0 relative pointer-events-none"
    >
      {/* Conteneur des messages (fond transparent pour voir MatrixRain parent) */}
      <div className="relative w-full h-full flex flex-col justify-end overflow-y-auto pointer-events-auto">
        {messages
          .filter(message => message.kind === 'chat')
          .map((message, index) => (
            <DialogueBubble
              key={message.id}
              sender={message.sender}
              text={message.text}
              align={message.sender === myCharacter ? 'right' : 'left'}
              index={index}
            />
          ))}
      </div>
    </main>
  );
}
