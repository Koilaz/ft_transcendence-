import { useState, useEffect } from 'react';

// General Ketchup : normal → légèrement en colère → en colère
export function AnimatedKetchupPortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/game/heads/generalketchup/headGeneralKetchup.webp',
    '/game/heads/generalketchup/headGeneralKetchupSlightAngry.webp',
    '/game/heads/generalketchup/headGeneralKetchupAngry.webp',
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },
      { delay: 2000, index: 1 },
      { delay: 3000, index: 2 },
      { delay: 4500, index: 1 },
      { delay: 5000, index: 0 },
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

  return <img src={images[currentIndex]} alt="General Ketchup" className={className} />;
}
