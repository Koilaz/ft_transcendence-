import { useState, useEffect } from 'react';

// Colonel Moutarde : réflexion → normal → transpiration
export function AnimatedMoutardePortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/game/heads/colonelmoutarde/headColonelMoutardeThinking.webp',
    '/game/heads/colonelmoutarde/headColonelMoutarde.webp',
    '/game/heads/colonelmoutarde/headColonelMoutardeSweating.webp',
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },
      { delay: 3000, index: 1 },
      { delay: 3500, index: 2 },
      { delay: 5500, index: 1 },
      { delay: 6000, index: 0 },
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
