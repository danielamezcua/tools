class CozyBonfire {
    constructor() {
        this.canvas = document.getElementById('bonfireCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.intensity = 1.0;
        this.isAudioPlaying = false;
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        
        // Pixel art settings
        this.pixelSize = 8;
        this.width = this.canvas.width / this.pixelSize;
        this.height = this.canvas.height / this.pixelSize;
        
        // Fire particles
        this.particles = [];
        this.logs = [];
        this.sparks = [];
        
        // Colors for the fire
        this.fireColors = [
            '#ffff00', // bright yellow
            '#ffaa00', // orange-yellow
            '#ff6600', // orange
            '#ff3300', // red-orange
            '#ff0000', // red
            '#cc0000', // dark red
            '#990000', // darker red
            '#660000'  // darkest red
        ];
        
        this.logColor = '#8B4513';
        this.emberColors = ['#ff6600', '#ff3300', '#ff0000'];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.createLogs();
        this.createInitialParticles();
        this.setupAudio();
        this.animate();
    }
    
    setupEventListeners() {
        const intensitySlider = document.getElementById('intensity');
        const intensityValue = document.getElementById('intensityValue');
        const toggleAudio = document.getElementById('toggleAudio');
        
        intensitySlider.addEventListener('input', (e) => {
            this.intensity = parseFloat(e.target.value);
            intensityValue.textContent = this.intensity.toFixed(1);
        });
        
        toggleAudio.addEventListener('click', () => {
            this.toggleAudio();
        });
    }
    
    async setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioBuffer = await this.createCracklingSound();
        } catch (error) {
            console.log('Audio setup failed:', error);
        }
    }
    
    async createCracklingSound() {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 10; // 10 seconds loop
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate crackling fire sound using noise and filtering
        for (let i = 0; i < data.length; i++) {
            let sample = 0;
            
            // Base crackling noise
            if (Math.random() < 0.1) {
                sample += (Math.random() - 0.5) * 0.3;
            }
            
            // Low frequency rumble
            sample += Math.sin(i * 0.001) * 0.1;
            
            // Random pops and crackles
            if (Math.random() < 0.005) {
                sample += (Math.random() - 0.5) * 0.8;
            }
            
            // Apply some filtering to make it warmer
            sample *= 0.3;
            data[i] = sample;
        }
        
        return buffer;
    }
    
    toggleAudio() {
        const button = document.getElementById('toggleAudio');
        
        if (!this.isAudioPlaying) {
            this.playAudio();
            button.textContent = '🔇 Stop Crackling';
            this.isAudioPlaying = true;
        } else {
            this.stopAudio();
            button.textContent = '🔊 Play Crackling';
            this.isAudioPlaying = false;
        }
    }
    
    playAudio() {
        if (this.audioContext && this.audioBuffer) {
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            this.audioSource.loop = true;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.3;
            
            this.audioSource.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            this.audioSource.start();
        }
    }
    
    stopAudio() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource = null;
        }
    }
    
    createLogs() {
        this.logs = [
            { x: 15, y: 30, width: 20, height: 4 },
            { x: 10, y: 32, width: 25, height: 4 },
            { x: 20, y: 34, width: 18, height: 4 }
        ];
    }
    
    createInitialParticles() {
        for (let i = 0; i < 50; i++) {
            this.particles.push(this.createFireParticle());
        }
    }
    
    createFireParticle() {
        return {
            x: 15 + Math.random() * 20,
            y: 30 + Math.random() * 5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -Math.random() * 2 - 1,
            life: Math.random() * 60 + 30,
            maxLife: Math.random() * 60 + 30,
            size: Math.random() * 3 + 1,
            colorIndex: 0
        };
    }
    
    createSpark() {
        if (Math.random() < 0.1 * this.intensity) {
            this.sparks.push({
                x: 15 + Math.random() * 20,
                y: 30 + Math.random() * 5,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 2,
                life: Math.random() * 30 + 10,
                maxLife: Math.random() * 30 + 10
            });
        }
    }
    
    updateParticles() {
        // Update fire particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx * this.intensity;
            p.y += p.vy * this.intensity;
            p.vx += (Math.random() - 0.5) * 0.1;
            p.vy -= 0.02; // slight upward acceleration
            p.life--;
            
            // Color transition based on life
            const lifeRatio = p.life / p.maxLife;
            p.colorIndex = Math.floor((1 - lifeRatio) * (this.fireColors.length - 1));
            
            if (p.life <= 0 || p.y < 0) {
                this.particles[i] = this.createFireParticle();
            }
        }
        
        // Update sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.1; // gravity
            s.life--;
            
            if (s.life <= 0 || s.y > this.height) {
                this.sparks.splice(i, 1);
            }
        }
        
        // Create new sparks
        this.createSpark();
    }
    
    drawPixel(x, y, color, size = 1) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            Math.floor(x) * this.pixelSize,
            Math.floor(y) * this.pixelSize,
            size * this.pixelSize,
            size * this.pixelSize
        );
    }
    
    render() {
        // Clear canvas with dark background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw logs
        this.logs.forEach(log => {
            for (let x = 0; x < log.width; x++) {
                for (let y = 0; y < log.height; y++) {
                    // Add some texture to logs
                    const brightness = Math.random() * 0.3 + 0.7;
                    const r = Math.floor(139 * brightness);
                    const g = Math.floor(69 * brightness);
                    const b = Math.floor(19 * brightness);
                    this.drawPixel(log.x + x, log.y + y, `rgb(${r},${g},${b})`);
                }
            }
        });
        
        // Draw fire particles
        this.particles.forEach(p => {
            if (p.life > 0 && p.colorIndex < this.fireColors.length) {
                const alpha = (p.life / p.maxLife) * this.intensity;
                const color = this.fireColors[p.colorIndex];
                
                // Add some flickering by randomly skipping some particles
                if (Math.random() < alpha) {
                    this.drawPixel(p.x, p.y, color, Math.ceil(p.size));
                }
            }
        });
        
        // Draw sparks
        this.sparks.forEach(s => {
            const alpha = s.life / s.maxLife;
            const colorIndex = Math.floor(Math.random() * this.emberColors.length);
            const color = this.emberColors[colorIndex];
            
            if (Math.random() < alpha * this.intensity) {
                this.drawPixel(s.x, s.y, color);
            }
        });
        
        // Add some glow effect around the fire
        const glowIntensity = this.intensity * 0.3;
        this.ctx.shadowColor = '#ff6600';
        this.ctx.shadowBlur = 20 * glowIntensity;
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Draw additional glow particles
        this.particles.forEach(p => {
            if (p.life > p.maxLife * 0.7 && Math.random() < 0.3) {
                this.ctx.fillStyle = `rgba(255, 100, 0, ${0.1 * this.intensity})`;
                this.ctx.fillRect(
                    (p.x - 2) * this.pixelSize,
                    (p.y - 2) * this.pixelSize,
                    4 * this.pixelSize,
                    4 * this.pixelSize
                );
            }
        });
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.shadowBlur = 0;
    }
    
    animate() {
        this.updateParticles();
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the bonfire when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CozyBonfire();
});