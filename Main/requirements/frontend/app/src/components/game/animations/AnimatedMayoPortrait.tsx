import { useState, useEffect } from 'react';

// Lieutenant Mayo : normal → yeux fermés → clin d'œil → sourire
export function AnimatedMayoPortrait({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/game/heads/lieutenantmayo/headLieutenantMayo.webp',
    '/game/heads/lieutenantmayo/headLieutenantMayoClosedEyes.webp',
    '/game/heads/lieutenantmayo/headLieutenantMayo.webp',
    '/game/heads/lieutenantmayo/headLieutenantMayoWink.webp',
    '/game/heads/lieutenantmayo/headLieutenantMayo.webp',
    '/game/heads/lieutenantmayo/headLieutenantMayoSmile.webp',
  ];

  useEffect(() => {
    const sequence = [
      { delay: 0, index: 0 },
      { delay: 2000, index: 1 },
      { delay: 2200, index: 2 },
      { delay: 3200, index: 3 },
      { delay: 3700, index: 4 },
      { delay: 4700, index: 5 },
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
    }, 7200);

    return () => clearInterval(loopInterval);
  }, []);

  return <img src={images[currentIndex]} alt="Lieutenant Mayo" className={className} />;
}
