import { useState, useEffect } from 'react';
import { getCharacterAnimation } from '../../../utils/characters';

// Composant générique d'animation de portrait.
// Lit la configuration (images, séquence, loopDuration) depuis characters.ts.
export function AnimatedPortrait({
  character,
  className,
}: {
  character: string;
  className?: string;
}) {
  const config = getCharacterAnimation(character);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!config) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const playSequence = () => {
      setCurrentIndex(0);
      config.sequence.forEach((step) => {
        timeouts.push(setTimeout(() => setCurrentIndex(step.index), step.delay));
      });
    };

    playSequence();

    const loopInterval = setInterval(playSequence, config.loopDuration);

    return () => {
      clearInterval(loopInterval);
      timeouts.forEach(clearTimeout);
    };
  }, [config]);

  if (!config) return null;

  return (
    <img
      src={config.images[currentIndex]}
      alt={config.alt}
      className={className}
    />
  );
}
