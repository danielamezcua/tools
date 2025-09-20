import '@/styles/globals.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const useAudio = (enabled: boolean, intensity: number) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      if (audioCtxRef.current) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const workletCode = `class WarmNoise extends AudioWorkletProcessor{constructor(){super();this.phase=0}process(inputs,outputs,parameters){const o=outputs[0];const out=o[0];for(let i=0;i<out.length;i++){const white=(Math.random()*2-1);this.phase=0.98*this.phase+0.02*white;out[i]=this.phase}return true}}registerProcessor('warm-noise',WarmNoise)`;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      if (cancelled) return;
      const node = new AudioWorkletNode(ctx, 'warm-noise');
      const gain = ctx.createGain();
      gain.gain.value = 0;
      node.connect(gain).connect(ctx.destination);
      noiseNodeRef.current = node;
      gainRef.current = gain;
    };
    setup();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;
    if (enabled) {
      if (ctx.state === 'suspended') ctx.resume();
      const target = Math.min(0.06 + intensity * 0.14, 0.25);
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.1);
    } else {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    }
  }, [enabled, intensity]);
};

const palette = [
  '#2b211a', // logs shadow
  '#6b3e2e', // logs mid
  '#8a523b', // logs light
  '#2c1b12', // ember bg
  '#7a2d10', // deep ember
  '#b8430f', // ember orange
  '#f26b1d', // flame orange
  '#ff9e2b', // flame light
  '#ffd166', // flame highlight
  '#fff3b0', // spark
];

const CozyBonfire: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [intensity, setIntensity] = useState<number>(0.6);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  useAudio(soundOn, intensity);

  // Pixel grid size (logical)
  const grid = useMemo(() => ({ w: 64, h: 64 }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame = 0;
    let raf = 0;
    const pixel = 6; // pixel size multiplier for crisp pixel-art
    const width = grid.w * pixel;
    const height = grid.h * pixel;
    canvas.width = width;
    canvas.height = height;
    canvas.style.imageRendering = 'pixelated';

    // Fire simulation buffers
    const fire = new Float32Array(grid.w * grid.h);

    const index = (x: number, y: number) => y * grid.w + x;

    const seedBase = () => {
      const baseY = grid.h - 1;
      for (let x = 0; x < grid.w; x++) {
        const noise = Math.random();
        fire[index(x, baseY)] = 0.7 + noise * 0.3;
      }
    };

    const step = () => {
      animationFrame++;
      // Add new embers at base based on intensity
      const embers = Math.max(2, Math.floor(4 + intensity * 8));
      for (let i = 0; i < embers; i++) {
        const x = Math.floor(Math.random() * grid.w);
        fire[index(x, grid.h - 1)] = 0.8 + Math.random() * 0.2;
      }

      // Propagate upwards with diffusion and cooling
      for (let y = 0; y < grid.h - 1; y++) {
        for (let x = 0; x < grid.w; x++) {
          const below = fire[index(x, y + 1)];
          const belowLeft = fire[index((x - 1 + grid.w) % grid.w, y + 1)];
          const belowRight = fire[index((x + 1) % grid.w, y + 1)];
          const below2 = fire[index(x, Math.min(grid.h - 1, y + 2))];
          const avg = (below + belowLeft + belowRight + below2) * 0.25;
          const cooling = 0.02 + (1 - intensity) * 0.04 + Math.random() * 0.01;
          const flicker = (Math.sin((x + animationFrame * (0.02 + intensity * 0.04))) + 1) * 0.02;
          fire[index(x, y)] = Math.max(0, avg - cooling + flicker);
        }
      }

      // Draw
      const imgData = ctx.createImageData(grid.w, grid.h);
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          const v = fire[index(x, y)];
          // Map intensity v (0..1) to palette
          const t = Math.max(0, Math.min(1, v));
          const p = t * (palette.length - 1);
          const i0 = Math.floor(p);
          const i1 = Math.min(palette.length - 1, i0 + 1);
          const f = p - i0;

          const c0 = palette[i0];
          const c1 = palette[i1];
          const parse = (hex: string) => {
            const n = parseInt(hex.slice(1), 16);
            return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
          };
          const a = parse(c0);
          const b = parse(c1);
          const r = Math.round(a.r + (b.r - a.r) * f);
          const g = Math.round(a.g + (b.g - a.g) * f);
          const bb = Math.round(a.b + (b.b - a.b) * f);

          const idx = (y * grid.w + x) * 4;
          imgData.data[idx] = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = bb;
          imgData.data[idx + 3] = 255;
        }
      }

      // Scale up for pixel-art look
      const off = new OffscreenCanvas(grid.w, grid.h);
      const offCtx = off.getContext('2d')!;
      offCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      // Dark vignette background
      ctx.fillStyle = '#0f0e0d';
      ctx.fillRect(0, 0, width, height);
      // Draw scaled
      // @ts-expect-error OffscreenCanvas toBitmap may not exist in TS lib
      const bmp = off.transferToImageBitmap();
      ctx.drawImage(bmp, 0, 0, width, height);

      // Draw logs at base
      const logH = 8 * pixel;
      ctx.fillStyle = '#2b211a';
      ctx.fillRect(8 * pixel, height - logH - 2 * pixel, width - 16 * pixel, 2 * pixel);
      ctx.fillStyle = '#6b3e2e';
      ctx.fillRect(10 * pixel, height - logH, width - 20 * pixel, 3 * pixel);
      ctx.fillStyle = '#8a523b';
      for (let i = 0; i < 8; i++) {
        const lx = 10 * pixel + i * 6 * pixel + (i % 2 === 0 ? 0 : 3 * pixel);
        ctx.fillRect(lx, height - logH - (i % 2 === 0 ? 0 : pixel), 5 * pixel, 2 * pixel);
      }
    };

    let last = 0;
    const loop = (t: number) => {
      if (t - last > 16) {
        step();
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };

    seedBase();
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [grid, intensity]);

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-3xl flex flex-col max-h-[90vh]">
        <CardHeader>
          <CardTitle className="text-foreground text-3xl font-bold">Cozy bonfire</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 items-center">
          <canvas
            ref={canvasRef}
            className="rounded-md border border-border bg-black shadow-inner"
            style={{ width: '100%', maxWidth: 640, aspectRatio: '1 / 1' }}
          />
          <div className="w-full flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Intensity</label>
            <Input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
            />
            <div className="flex items-center justify-between text-sm">
              <span>Calm</span>
              <button
                onClick={() => setSoundOn(v => !v)}
                className="underline hover:opacity-80"
                aria-pressed={soundOn}
              >
                {soundOn ? 'Sound on' : 'Sound off'}
              </button>
              <span>Roaring</span>
            </div>
          </div>
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
      <CozyBonfire />
    </React.StrictMode>
  );
}

export default CozyBonfire;

