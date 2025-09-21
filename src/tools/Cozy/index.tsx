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
  const rotXRef = useRef<number>(0);
  const rotYRef = useRef<number>(0);
  const draggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

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

    // Moon parameters (fixed center/radius; rotation via angle ref)
    const moon = {
      cx: Math.floor(grid.w * 0.72),
      cy: Math.floor(grid.h * 0.28),
      r: Math.floor(Math.min(grid.w, grid.h) * 0.22)
    };

    // Precompute crater seeds on unit hemisphere (3D)
    type Crater = { vx: number; vy: number; vz: number; r: number };
    const craters: Crater[] = (() => {
      const out: Crater[] = [];
      const rand = (seed: number) => {
        let s = seed;
        return () => {
          s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s |= 0;
          return ((s >>> 0) % 1000) / 1000;
        };
      };
      const r = rand(1337);
      const count = 10;
      for (let i = 0; i < count; i++) {
        const phi = r() * Math.PI * 2; // 0..2pi
        const cosTheta = r(); // 0..1 for hemisphere (z = cosTheta)
        const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
        const vx = sinTheta * Math.cos(phi);
        const vy = sinTheta * Math.sin(phi);
        const vz = cosTheta; // facing camera
        const rr = Math.max(1, Math.floor(2 + r() * 3));
        out.push({ vx, vy, vz, r: rr });
      }
      return out;
    })();

    const insideMoon = (x: number, y: number) => {
      const dx = x - moon.cx;
      const dy = y - moon.cy;
      return dx * dx + dy * dy <= moon.r * moon.r;
    };

    const drawMoon = () => {
      // Disk with simple radial shading and dithering
      for (let y = Math.max(0, moon.cy - moon.r); y < Math.min(grid.h, moon.cy + moon.r); y++) {
        for (let x = Math.max(0, moon.cx - moon.r); x < Math.min(grid.w, moon.cx + moon.r); x++) {
          const dx = x - moon.cx;
          const dy = y - moon.cy;
          const d2 = dx * dx + dy * dy;
          if (d2 <= moon.r * moon.r) {
            const d = Math.sqrt(d2) / moon.r; // 0..1
            let color = '#ecece8';
            if (d > 0.85) color = '#d9d9d6';
            else if (d > 0.6) color = '#e4e4e0';
            // Dither
            if (((x + y) & 1) === 0 && d > 0.7) color = '#dededb';
            bctx.globalAlpha = 1;
            bctx.fillStyle = color;
            bctx.fillRect(x, y, 1, 1);
          }
        }
      }
      // Craters (simple darker spots), rotated as if on a 3D sphere
      const rx = rotXRef.current;
      const ry = rotYRef.current;
      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      for (const c of craters) {
        // Apply rotation Rx then Ry to crater normal vector
        const y1 = c.vy * cosX - c.vz * sinX;
        const z1 = c.vy * sinX + c.vz * cosX;
        const x2 = c.vx * cosY + z1 * sinY;
        const z2 = -c.vx * sinY + z1 * cosY;
        const y2 = y1;
        if (z2 <= 0) continue; // back side
        const cx = Math.floor(moon.cx + x2 * moon.r);
        const cy = Math.floor(moon.cy + y2 * moon.r);
        const scale = 0.6 + 0.4 * z2; // foreshorten toward rim
        const rr = Math.max(1, Math.floor(c.r * scale));
        for (let y = cy - rr; y <= cy + rr; y++) {
          for (let x = cx - rr; x <= cx + rr; x++) {
            if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) continue;
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= rr * rr && insideMoon(x, y)) {
              const edge = Math.abs(Math.sqrt(dx * dx + dy * dy) - rr) < 0.8;
              bctx.globalAlpha = edge ? 0.35 : 0.25;
              bctx.fillStyle = edge ? '#bfbfbb' : '#cfcfcb';
              bctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }
    };

    const drawForeground = () => {
      // Height maps for two hill layers
      const h1: number[] = new Array(grid.w);
      const h2: number[] = new Array(grid.w);
      for (let x = 0; x < grid.w; x++) {
        const y1 = Math.floor(grid.h * 0.74 + Math.sin(x * 0.08) * 2 + Math.sin(x * 0.23) * 1.5);
        const y2 = Math.floor(grid.h * 0.84 + Math.sin((x + 10) * 0.06) * 3 + Math.sin(x * 0.17) * 2);
        h1[x] = Math.min(grid.h - 1, y1);
        h2[x] = Math.min(grid.h - 1, y2);
      }
      // Far hill
      bctx.globalAlpha = 1;
      bctx.fillStyle = '#0b0e14';
      for (let x = 0; x < grid.w; x++) {
        bctx.fillRect(x, h1[x], 1, grid.h - h1[x]);
      }
      // Near hill
      bctx.fillStyle = '#04070d';
      for (let x = 0; x < grid.w; x++) {
        bctx.fillRect(x, h2[x], 1, grid.h - h2[x]);
      }
      // Trees on near hill (silhouettes)
      const trunk = '#020409';
      const leaf = '#000000';
      const hash = (n: number) => {
        const s = Math.sin(n * 12.9898) * 43758.5453;
        return s - Math.floor(s);
      };
      for (let x = 4; x < grid.w - 4; x += 3) {
        if (hash(x * 1.7) < 0.08) {
          const baseY = h2[x];
          const heightPx = 5 + Math.floor(hash(x * 3.1) * 5); // 5..9
          // Trunk
          bctx.fillStyle = trunk;
          bctx.fillRect(x, baseY - heightPx + 2, 1, Math.min(heightPx - 2, grid.h));
          // Canopy (simple triangles)
          bctx.fillStyle = leaf;
          let w = 1;
          for (let yy = 0; yy < heightPx - 1; yy++) {
            const y = baseY - yy - 1;
            const span = Math.floor(w / 2);
            for (let i = -span; i <= span; i++) {
              bctx.fillRect(x + i, y, 1, 1);
            }
            if (yy % 2 === 0) w += 2;
          }
        }
      }
    };

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

      // Moon (behind stars/comets)
      drawMoon();

      // Stars
      for (const s of stars) {
        s.phase += s.speed;
        if (s.phase > Math.PI * 2) s.phase -= Math.PI * 2;
        const twinkle = 0.5 + 0.5 * Math.sin(s.phase);
        const base = 0.25 + (s.warm ? 0.05 : 0);
        const alpha = Math.min(1, Math.max(0.1, base + twinkle * 0.6 + (Math.random() - 0.5) * 0.05));
        if (!insideMoon(s.x, s.y)) {
          bctx.globalAlpha = alpha;
          bctx.fillStyle = s.warm ? '#ffe6b0' : '#dfe9ff';
          bctx.fillRect(s.x, s.y, 1, 1);
        }
        // Rare sparkle cross
        if (alpha > 0.85 && Math.random() < 0.02 && !insideMoon(s.x, s.y)) {
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
        // Mouse gravity (subtle deflection when near)
        if (mouseRef.current.active) {
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;
          const dxm = mx - c.x;
          const dym = my - c.y;
          const dist = Math.hypot(dxm, dym);
          if (dist < 20) {
            const strength = (1 - dist / 20) * 0.03; // subtle
            const ux = dxm / (dist || 1);
            const uy = dym / (dist || 1);
            c.dx += ux * strength;
            c.dy += uy * strength;
          }
        }
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

      // Foreground silhouettes (in front of sky)
      drawForeground();

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

    // Mouse interactions
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = grid.w / rect.width;
      const sy = grid.h / rect.height;
      const gx = (e.clientX - rect.left) * sx;
      const gy = (e.clientY - rect.top) * sy;
      mouseRef.current.x = gx;
      mouseRef.current.y = gy;
      mouseRef.current.active = true;
      if (draggingRef.current && lastMouseRef.current) {
        const dx = gx - lastMouseRef.current.x;
        const dy = gy - lastMouseRef.current.y;
        rotYRef.current += dx * 0.02; // horizontal drag rotates around Y
        rotXRef.current += -dy * 0.02; // vertical drag rotates around X
        lastMouseRef.current = { x: gx, y: gy };
      }
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      draggingRef.current = false;
      lastMouseRef.current = null;
    };
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = grid.w / rect.width;
      const sy = grid.h / rect.height;
      const x = (e.clientX - rect.left) * sx;
      const y = (e.clientY - rect.top) * sy;
      const dx = x - moon.cx;
      const dy = y - moon.cy;
      if (dx * dx + dy * dy <= moon.r * moon.r) {
        draggingRef.current = true;
        lastMouseRef.current = { x, y };
      }
    };
    const handleMouseUp = () => {
      draggingRef.current = false;
      lastMouseRef.current = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
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

