import { useState, useEffect } from 'react';

// Major Wasabi : petites larmes → fontaine de pleurs → petites larmes
export function AnimatedWasabiPortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/game/heads/majorwasabi/headMajorWasabiTears.webp',
    '/game/heads/majorwasabi/headMajorWasabiCrying.webp',
    '/game/heads/majorwasabi/headMajorWasabiCryingEnd.webp',
    '/game/heads/majorwasabi/headMajorWasabi.webp',
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },
      { delay: 3000, index: 1 },
      { delay: 5000, index: 2 },
      { delay: 5100, index: 3 },
      { delay: 5200, index: 0 },
    ];

    sequence.forEach((step) => {
      setTimeout(() => {
        setCurrentIndex(step.index);
      }, step.delay);
    });

    const loopInterval = setInterval(() => {
      setCurrentIndex(0);
      sequence.forEach((step) => {
        setTimeout(() => {
          setCurrentIndex(step.index);
        }, step.delay);
      });
    }, 5200);

    return () => clearInterval(loopInterval);
  }, []);

  return <img src={images[currentIndex]} alt="Major Wasabi" className={className} />;
}
