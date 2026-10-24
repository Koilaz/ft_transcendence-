import { useState, useEffect } from 'react';

// Caporal Poivre : moustache qui bouge
export function AnimatedPoivrePortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/game/heads/caporalpoivre/headCaporalPoivre.webp',
    '/game/heads/caporalpoivre/headCaporalPoivreMustacheStraight.webp',
    '/game/heads/caporalpoivre/headCaporalPoivreMustacheUp.webp',
    '/game/heads/caporalpoivre/headCaporalPoivreMustacheDown.webp',
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },
      { delay: 2000, index: 1 },
      { delay: 2200, index: 2 },
      { delay: 2350, index: 3 },
      { delay: 2500, index: 1 },
      { delay: 2700, index: 0 },
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
