// Images pour les différentes phases du timer (WebP optimisées - ~55 Ko chacune)
const bunnyImages = {
  normal: '/bunnyPinkPhaseNormal.webp',
  neutral: '/bunnyPinkPhaseNeutral.webp',
  nervous: '/bunnyPinkPhaseNervous.webp',
  stress: '/bunnyPinkPhaseStress.webp',
} as const;

// Seuil pour changer d'animation (en secondes)
// Pour un tour de 25 secondes :
// - normal: 20-25s
// - neutral: 10-19s
// - nervous: 5-9s
// - stress: 0-4s
function getBunnyPhase(countdown: number): keyof typeof bunnyImages {
  if (countdown >= 20) return 'normal';
  if (countdown >= 10) return 'neutral';
  if (countdown >= 5) return 'nervous';
  return 'stress';
}

type TimerBunnyProps = {
  countdown: number;
  size?: number;
};

export function TimerBunny({ countdown, size = 60 }: TimerBunnyProps) {
  const phase = getBunnyPhase(countdown);
  const imgSrc = bunnyImages[phase];

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      style={size ? { width: size, height: size } : {}}
    >
      {/* Image du bunny */}
      <img
        src={imgSrc}
        alt={`Timer bunny - ${phase}`}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
