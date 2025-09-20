import '@/styles/globals.css';
import React, { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Star = {
  x: number;
  y: number;
  phase: number;
  speed: number;
  warm: boolean;
};

type Comet = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  length: number;
  life: number;
};

const CozySky: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const grid = useMemo(() => ({ w: 160, h: 90 }), []); // 16:9 logical pixels

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = 6;
    const width = grid.w * pixel;
    const height = grid.h * pixel;
    canvas.width = width;
    canvas.height = height;
    canvas.style.imageRendering = 'pixelated';

    // Offscreen buffer (regular canvas) at logical pixel resolution
    const buffer = document.createElement('canvas');
    buffer.width = grid.w;
    buffer.height = grid.h;
    const bctx = buffer.getContext('2d')!;
    bctx.imageSmoothingEnabled = false;

    // Initialize stars
    const starCount = 110;
    const stars: Star[] = Array.from({ length: starCount }).map(() => ({
      x: Math.floor(Math.random() * grid.w),
      y: Math.floor(Math.random() * grid.h),
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.015,
      warm: Math.random() < 0.22
    }));

    let comets: Comet[] = [];
    let raf = 0;

    const draw = () => {
      // Background
      bctx.globalAlpha = 1;
      bctx.fillStyle = '#070a14'; // deep night blue
      bctx.fillRect(0, 0, grid.w, grid.h);

      // Gentle vignette band at horizon
      bctx.fillStyle = '#090c18';
      for (let y = Math.floor(grid.h * 0.7); y < grid.h; y++) {
        if ((y & 1) === 0) bctx.fillRect(0, y, grid.w, 1);
      }

      // Stars
      for (const s of stars) {
        s.phase += s.speed;
        if (s.phase > Math.PI * 2) s.phase -= Math.PI * 2;
        const twinkle = 0.5 + 0.5 * Math.sin(s.phase);
        const base = 0.25 + (s.warm ? 0.05 : 0);
        const alpha = Math.min(1, Math.max(0.1, base + twinkle * 0.6 + (Math.random() - 0.5) * 0.05));
        bctx.globalAlpha = alpha;
        bctx.fillStyle = s.warm ? '#ffe6b0' : '#dfe9ff';
        bctx.fillRect(s.x, s.y, 1, 1);
        // Rare sparkle cross
        if (alpha > 0.85 && Math.random() < 0.02) {
          bctx.globalAlpha = alpha * 0.5;
          bctx.fillRect(s.x - 1, s.y, 1, 1);
          bctx.fillRect(s.x + 1, s.y, 1, 1);
          bctx.fillRect(s.x, s.y - 1, 1, 1);
          bctx.fillRect(s.x, s.y + 1, 1, 1);
        }
      }

      // Maybe spawn a comet
      if (Math.random() < 0.004 && comets.length < 2) {
        const fromLeft = Math.random() < 0.5;
        const startX = fromLeft ? -10 : grid.w + 10;
        const startY = Math.floor(10 + Math.random() * (grid.h * 0.5));
        const dx = (fromLeft ? 1 : -1) * (0.8 + Math.random() * 0.6);
        const dy = 0.3 + Math.random() * 0.5;
        comets.push({ x: startX, y: startY, dx, dy, length: 14 + Math.floor(Math.random() * 10), life: 1 });
      }

      // Draw and update comets
      const nextComets: Comet[] = [];
      for (const c of comets) {
        // Tail
        for (let i = 0; i < c.length; i++) {
          const px = Math.round(c.x - c.dx * i);
          const py = Math.round(c.y - c.dy * i);
          if (px < 0 || py < 0 || px >= grid.w || py >= grid.h) continue;
          const t = i / c.length;
          const alpha = (1 - t) * 0.9 * c.life;
          bctx.globalAlpha = alpha;
          bctx.fillStyle = t < 0.3 ? '#ffffff' : '#bcd4ff';
          bctx.fillRect(px, py, 1, 1);
        }
        // Head position update
        c.x += c.dx;
        c.y += c.dy;
        c.life *= 0.995;
        if (c.x > -20 && c.x < grid.w + 20 && c.y > -20 && c.y < grid.h + 20 && c.life > 0.05) {
          nextComets.push(c);
        }
      }
      comets = nextComets;

      // Blit to main canvas scaled
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(buffer, 0, 0, width, height);
    };

    let last = 0;
    const loop = (t: number) => {
      if (t - last > 16) {
        draw();
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [grid]);

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-3xl flex flex-col max-h-[90vh]">
        <CardHeader>
          <CardTitle className="text-foreground text-3xl font-bold">Cozy night sky</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 items-center">
          <canvas
            ref={canvasRef}
            className="rounded-md border border-border bg-black shadow-inner"
            style={{ width: '100%', maxWidth: 800, aspectRatio: '16 / 9' }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <CozySky />
    </React.StrictMode>
  );
}

export default CozySky;

