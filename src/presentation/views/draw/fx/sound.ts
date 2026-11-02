// sons do sorteio feitos na hora pelo navegador (Web Audio, sem arquivo nenhum): rufar de tambor, "pop" de cada equipe,
// "ding" de cada Pokémon e uma fanfarra no fim. Desligado por padrão; a escolha fica salva no navegador
const KEY = 'sorteio-som';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export class DrawSound {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  enabled = readEnabled();

  toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(KEY, this.enabled ? 'on' : 'off');
    } catch {
      // sem localStorage a escolha vale só nesta aba
    }
    if (this.enabled) this.audio();
    return this.enabled;
  }

  private audio(): AudioContext | null {
    if (!this.enabled || typeof AudioContext === 'undefined') return null;
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, startIn: number, length: number, volume: number, type: OscillatorType = 'sine') {
    const ctx = this.audio();
    if (!ctx) return;
    const at = ctx.currentTime + startIn;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  private hit(volume: number) {
    const ctx = this.audio();
    if (!ctx) return;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'bandpass';
    filter.frequency.value = 180;
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  // rufar de tambor até chamar a função devolvida (cresce aos poucos)
  drumroll(): () => void {
    if (!this.enabled) return () => undefined;
    let volume = 0.25;
    const timer = window.setInterval(() => {
      this.hit(volume);
      volume = Math.min(0.9, volume + 0.02);
    }, 55);
    return () => window.clearInterval(timer);
  }

  tick(): void {
    this.tone(880, 0, 0.08, 0.15, 'square');
  }

  pop(): void {
    this.tone(520, 0, 0.12, 0.2, 'triangle');
  }

  ding(): void {
    this.tone(1318, 0, 0.5, 0.25);
    this.tone(1760, 0.06, 0.6, 0.18);
  }

  fanfare(): void {
    [523, 659, 784, 1047].forEach((freq, i) =>
      this.tone(freq, i * 0.12, i === 3 ? 0.9 : 0.25, 0.25, 'triangle'),
    );
  }
}
