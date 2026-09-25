// @ts-nocheck
import { useEffect, useRef, useState } from 'react';

const CHARACTERS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [columns, setColumns] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      setColumns(Math.floor(rect.width / 20));
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || columns === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tableau pour stocker la position de chaque colonne
    const drops: number[] = Array(columns).fill(1);

    function draw() {
      // Fond semi-transparent pour l'effet de traînées
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Couleur des caractères (vert Matrix)
      ctx.fillStyle = '#3ecf8e';
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        // Caractère aléatoire
        const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

        // Position x
        const x = i * 20;

        // Position y
        const y = drops[i] * 20;

        // Dessiner le caractère
        ctx.fillText(char, x, y);

        // Réinitialiser la goutte si elle dépasse la hauteur
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Incrémenter la position
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, [columns]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover opacity-20 md:opacity-30"
      style={{ zIndex: 1 }}
    />
  );
}
