// Images pour les différentes phases du timer (WebP optimisées - ~55 Ko chacune)
const bunnyImages = {
  normal: '/game/timer/bunnyPinkPhaseNormal.webp',
  neutral: '/game/timer/bunnyPinkPhaseNeutral.webp',
  nervous: '/game/timer/bunnyPinkPhaseNervous.webp',
  stress: '/game/timer/bunnyPinkPhaseStress.webp',
} as const;

function getBunnyPhase(countdown: number): keyof typeof bunnyImages {
  if (countdown >= 5) return 'normal';
  if (countdown >= 4) return 'neutral';
  if (countdown >= 3) return 'stress';
  return 'nervous';
}

type TimerBunnyProps = {
  countdown: number;
};

export function TimerBunny({ countdown }: TimerBunnyProps) {
  const phase = getBunnyPhase(countdown);
  const imgSrc = bunnyImages[phase];

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Image du bunny */}
      <img
        src={imgSrc}
        alt={`Timer bunny - ${phase}`}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
