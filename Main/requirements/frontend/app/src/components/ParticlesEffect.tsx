// @ts-nocheck
// Composant d'animation de particules (effet souris) - version avec refs
import { useEffect, useRef } from 'react';

type ParticlesEffectProps = {
  particleCount?: number;
  backgroundColor?: string;
  maxSize?: number;
  followSpeed?: number;
  visibleFromStart?: boolean;
};

export function ParticlesEffect({
  particleCount = 200,
  backgroundColor = 'transparent',
  maxSize = 8,
  followSpeed = 0.5,
  visibleFromStart = false,
}: ParticlesEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointRef = useRef({ x: 0, y: 0 });
  const hueRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to parent
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      } else {
        canvas.width = 300;
        canvas.height = 200;
      }
      // Center point initially
      pointRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
    };

    resizeCanvas();

    // Particle class - fidèle à l'original
    class Particle {
      x: number;
      y: number;
      size: number;
      velocity: number;
      alpha: number;
      hue: number;
      changed: boolean | null;
      changedFrame: number;
      maxChangedFrames: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.hue = hueRef.current;
        this.alpha = visibleFromStart ? 0.5 : 0;
        this.size = Math.random() * (maxSize - 1) + 1;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.velocity = this.size * followSpeed;
        this.changed = null;
        this.changedFrame = 0;
        this.maxChangedFrames = 50;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = `hsla(${this.hue}, 100%, 50%, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.stroke();
        this.update();
      }

      update() {
        const point = pointRef.current;
        if (this.changed) {
          this.alpha *= 0.92;
          this.size += 2;
          this.changedFrame++;
          if (this.changedFrame > this.maxChangedFrames) {
            this.reset();
          }
        } else if (this.distance(point.x, point.y) < 50) {
          this.changed = true;
        } else {
          const dx = point.x - this.x;
          const dy = point.y - this.y;
          const angle = Math.atan2(dy, dx);
          
          this.alpha += 0.01;
          this.x += this.velocity * Math.cos(angle);
          this.y += this.velocity * Math.sin(angle);
          this.velocity += 0.02;
        }
      }

      distance(x: number, y: number) {
        return Math.hypot(x - this.x, y - this.y);
      }
    }

    // Initialize particles
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        particles.push(new Particle());
      }, i * 10);
    }
    particlesRef.current = particles;

    // Animation loop - uses pointRef which is mutable
    const animate = () => {
      // Clear with background
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      particles.forEach((p) => {
        p.draw(ctx);
      });
      
      hueRef.current += 0.3;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Event handlers - update ref directly
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = (e as MouseEvent).clientX || (e as TouchEvent).touches?.[0]?.clientX || 0;
      const clientY = (e as MouseEvent).clientY || (e as TouchEvent).touches?.[0]?.clientY || 0;
      
      // Calculate position relative to canvas
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      // Only update if mouse is over canvas
      if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
        pointRef.current = { x, y };
      }
    };

    const handleMouseLeave = () => {
      pointRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
    };

    const handleResize = () => {
      resizeCanvas();
      // Recenter point after resize
      pointRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
    };

    // Attach events directly to canvas
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [particleCount, backgroundColor, maxSize, followSpeed, visibleFromStart]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ display: 'block' }}
    />
  );
}
