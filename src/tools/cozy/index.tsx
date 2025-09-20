import '@/styles/globals.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createRoot } from 'react-dom/client';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorIndex: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Log {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CozyBonfire: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  const [intensity, setIntensity] = useState<number>(1.0);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  
  // Canvas and fire settings
  const pixelSize = 6;
  const canvasWidth = 480;
  const canvasHeight = 320;
  const width = canvasWidth / pixelSize;
  const height = canvasHeight / pixelSize;
  
  // Fire colors (warm oranges and reds)
  const fireColors = [
    '#ffff88', // bright yellow
    '#ffdd44', // yellow-orange
    '#ffaa22', // orange-yellow
    '#ff8800', // orange
    '#ff6600', // red-orange
    '#ff4400', // red
    '#cc2200', // dark red
    '#881100'  // darkest red
  ];
  
  const emberColors = ['#ff8800', '#ff4400', '#ff2200'];
  
  // Static logs
  const logs: Log[] = [
    { x: 20, y: 45, width: 25, height: 5 },
    { x: 15, y: 48, width: 30, height: 5 },
    { x: 25, y: 51, width: 22, height: 5 }
  ];

  // Create crackling fire sound
  const createCracklingSound = useCallback(async (): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    
    const sampleRate = audioContextRef.current.sampleRate;
    const duration = 8; // 8 seconds loop
    const buffer = audioContextRef.current.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate realistic crackling fire sound
    for (let i = 0; i < data.length; i++) {
      let sample = 0;
      
      // Base crackling noise
      if (Math.random() < 0.08) {
        sample += (Math.random() - 0.5) * 0.4;
      }
      
      // Low frequency rumble (fire base)
      sample += Math.sin(i * 0.0008) * 0.12;
      sample += Math.sin(i * 0.0012) * 0.08;
      
      // Random pops and crackles
      if (Math.random() < 0.003) {
        sample += (Math.random() - 0.5) * 0.9;
      }
      
      // Occasional larger pops
      if (Math.random() < 0.0008) {
        sample += (Math.random() - 0.5) * 1.2;
      }
      
      // Apply filtering for warmth
      sample *= 0.25;
      data[i] = sample;
    }
    
    return buffer;
  }, []);

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioBufferRef.current = await createCracklingSound();
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    };
    
    initAudio();
    
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [createCracklingSound]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    if (isAudioPlaying) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      setIsAudioPlaying(false);
    } else {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBufferRef.current;
      audioSourceRef.current.loop = true;
      
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 0.2 * intensity;
      
      audioSourceRef.current.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      audioSourceRef.current.start();
      
      setIsAudioPlaying(true);
    }
  }, [isAudioPlaying, intensity]);

  // Create fire particle
  const createFireParticle = useCallback((): Particle => {
    return {
      x: 20 + Math.random() * 25,
      y: 45 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -Math.random() * 2.5 - 1.2,
      life: Math.random() * 50 + 40,
      maxLife: Math.random() * 50 + 40,
      size: Math.random() * 2.5 + 1,
      colorIndex: 0
    };
  }, []);

  // Initialize particles
  useEffect(() => {
    const initialParticles: Particle[] = [];
    for (let i = 0; i < Math.floor(60 * intensity); i++) {
      initialParticles.push(createFireParticle());
    }
    setParticles(initialParticles);
  }, [createFireParticle, intensity]);

  // Draw pixel
  const drawPixel = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.floor(x) * pixelSize,
      Math.floor(y) * pixelSize,
      size * pixelSize,
      size * pixelSize
    );
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update particles
    setParticles(prevParticles => {
      const updatedParticles = prevParticles.map(p => {
        const newP = { ...p };
        newP.x += newP.vx * intensity;
        newP.y += newP.vy * intensity;
        newP.vx += (Math.random() - 0.5) * 0.15;
        newP.vy -= 0.03; // upward acceleration
        newP.life--;
        
        // Color transition based on life
        const lifeRatio = newP.life / newP.maxLife;
        newP.colorIndex = Math.floor((1 - lifeRatio) * (fireColors.length - 1));
        
        return newP;
      }).filter(p => p.life > 0 && p.y > 0);
      
      // Add new particles to maintain count
      const targetCount = Math.floor(60 * intensity);
      while (updatedParticles.length < targetCount) {
        updatedParticles.push(createFireParticle());
      }
      
      return updatedParticles;
    });

    // Update sparks
    setSparks(prevSparks => {
      let updatedSparks = prevSparks.map(s => {
        const newS = { ...s };
        newS.x += newS.vx;
        newS.y += newS.vy;
        newS.vy += 0.15; // gravity
        newS.life--;
        return newS;
      }).filter(s => s.life > 0 && s.y < height);
      
      // Create new sparks occasionally
      if (Math.random() < 0.12 * intensity) {
        updatedSparks.push({
          x: 20 + Math.random() * 25,
          y: 45 + Math.random() * 8,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 4 - 2,
          life: Math.random() * 25 + 15,
          maxLife: Math.random() * 25 + 15
        });
      }
      
      return updatedSparks;
    });

    // Draw logs
    logs.forEach(log => {
      for (let x = 0; x < log.width; x++) {
        for (let y = 0; y < log.height; y++) {
          // Add texture to logs
          const brightness = Math.random() * 0.25 + 0.75;
          const r = Math.floor(101 * brightness);
          const g = Math.floor(67 * brightness);
          const b = Math.floor(33 * brightness);
          drawPixel(ctx, log.x + x, log.y + y, `rgb(${r},${g},${b})`);
        }
      }
    });

    // Draw fire particles
    particles.forEach(p => {
      if (p.life > 0 && p.colorIndex < fireColors.length) {
        const alpha = (p.life / p.maxLife) * intensity;
        const color = fireColors[p.colorIndex];
        
        // Flickering effect
        if (Math.random() < alpha * 0.8) {
          drawPixel(ctx, p.x, p.y, color, Math.ceil(p.size));
        }
      }
    });

    // Draw sparks
    sparks.forEach(s => {
      const alpha = s.life / s.maxLife;
      const colorIndex = Math.floor(Math.random() * emberColors.length);
      const color = emberColors[colorIndex];
      
      if (Math.random() < alpha * intensity) {
        drawPixel(ctx, s.x, s.y, color);
      }
    });

    // Add glow effect
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 15 * intensity;
    ctx.globalCompositeOperation = 'lighter';
    
    // Additional glow particles
    particles.forEach(p => {
      if (p.life > p.maxLife * 0.6 && Math.random() < 0.2 * intensity) {
        ctx.fillStyle = `rgba(255, 120, 0, ${0.08 * intensity})`;
        ctx.fillRect(
          (p.x - 1.5) * pixelSize,
          (p.y - 1.5) * pixelSize,
          3 * pixelSize,
          3 * pixelSize
        );
      }
    });
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;

    animationRef.current = requestAnimationFrame(animate);
  }, [particles, sparks, intensity, createFireParticle, drawPixel]);

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Update audio volume when intensity changes
  useEffect(() => {
    if (audioSourceRef.current && audioContextRef.current && isAudioPlaying) {
      // We need to restart the audio with new gain
      toggleAudio(); // Stop
      setTimeout(() => toggleAudio(), 100); // Restart with new intensity
    }
  }, [intensity, toggleAudio, isAudioPlaying]);

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-4xl flex flex-col">
        <CardHeader className="text-center">
          <CardTitle className="text-foreground text-4xl font-bold mb-2">
            🔥 Cozy Bonfire 🔥
          </CardTitle>
          <p className="text-muted-foreground">
            Relax by the warm glow of a crackling fire
          </p>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center space-y-6">
          {/* Bonfire Canvas */}
          <div className="relative p-4 bg-black rounded-lg border-2 border-amber-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="rounded-md shadow-inner"
              style={{
                background: 'linear-gradient(to bottom, #0a0a0a 0%, #1a1a1a 100%)',
                boxShadow: `0 0 ${30 * intensity}px rgba(255, 100, 0, ${0.3 * intensity})`
              }}
            />
          </div>
          
          {/* Controls */}
          <div className="w-full max-w-md space-y-4">
            {/* Intensity Slider */}
            <div className="space-y-2">
              <label className="block text-lg font-semibold text-amber-600 text-center">
                Bonfire Intensity: {intensity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full h-3 bg-gradient-to-r from-amber-800 via-amber-600 to-orange-500 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #92400e, #d97706, #ea580c)`
                }}
              />
            </div>
            
            {/* Audio Toggle */}
            <Button
              onClick={toggleAudio}
              variant="outline"
              size="lg"
              className="w-full bg-amber-900 hover:bg-amber-800 text-amber-100 border-amber-700 transition-all duration-300"
            >
              {isAudioPlaying ? '🔇 Stop Crackling' : '🔊 Play Crackling'}
            </Button>
            
            {/* Info */}
            <div className="text-center text-sm text-muted-foreground bg-amber-950/20 p-3 rounded-lg border border-amber-800/30">
              <p>Adjust the intensity to control the flame height and activity.</p>
              <p>Turn on the crackling sounds for the full cozy experience.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: #f59e0b;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.7);
          border: 2px solid #92400e;
        }
        
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #f59e0b;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.7);
          border: 2px solid #92400e;
        }
      `}</style>
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