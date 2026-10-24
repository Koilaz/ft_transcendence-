import { useState, useEffect } from 'react';

// Marechal Cocktail : normal → surpris → normal
export function AnimatedCocktailPortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/game/heads/marechalcocktail/headMarechalCocktail.webp',
    '/game/heads/marechalcocktail/headMarechalCocktailSurprised.webp',
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },
      { delay: 3000, index: 1 },
      { delay: 4500, index: 0 },
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

  return <img src={images[currentIndex]} alt="Marechal Cocktail" className={className} />;
}
