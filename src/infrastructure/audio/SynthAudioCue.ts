import type { AudioCue } from './AudioCue';
import type { AudioEngine } from './AudioEngine';

const DURATION = 1.6;
const IMPACT_AT = 1.25;
// volume conservador: o master já está em 0.5
const CUE_VOLUME = 0.7;
const SILENT = 0.0001;

type Voice = [type: OscillatorType, ratio: number, detune: number];
const PAD_VOICES: Voice[] = [
  ['sawtooth', 1, -9],
  ['sawtooth', 1, 9],
  ['sine', 0.5, 0],
];

// "power-up" de ~1,6s feito na hora com Web Audio: ruído subindo + pad + impacto suave
export class SynthAudioCue implements AudioCue {
  private readonly engine: AudioEngine;
  private noise: AudioBuffer | null = null;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  play(): Promise<void> {
    const ctx = this.engine.context;
    const out = this.engine.output;
    if (!ctx || !out || ctx.state !== 'running') return Promise.resolve();

    const t0 = ctx.currentTime + 0.03;
    const bus = ctx.createGain();
    bus.gain.value = CUE_VOLUME;
    bus.connect(out);
    this.sweep(ctx, bus, t0);
    this.pad(ctx, bus, t0);
    this.impact(ctx, bus, t0 + IMPACT_AT);
    setTimeout(() => bus.disconnect(), (DURATION + 0.5) * 1000);
    return Promise.resolve();
  }

  // ruído em banda estreita subindo: a sensação de "carregando"
  private sweep(ctx: AudioContext, out: AudioNode, t0: number): void {
    const src = this.noiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(260, t0);
    filter.frequency.exponentialRampToValueAtTime(5200, t0 + IMPACT_AT);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENT, t0);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + IMPACT_AT - 0.05);
    gain.gain.exponentialRampToValueAtTime(SILENT, t0 + IMPACT_AT + 0.12);
    src.connect(filter).connect(gain).connect(out);
    src.start(t0);
    src.stop(t0 + IMPACT_AT + 0.2);
  }

  // duas serras desafinadas + seno uma oitava abaixo, com o filtro abrindo junto
  private pad(ctx: AudioContext, out: AudioNode, t0: number): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(320, t0);
    filter.frequency.exponentialRampToValueAtTime(2800, t0 + IMPACT_AT);
    filter.frequency.exponentialRampToValueAtTime(900, t0 + DURATION);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENT, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + IMPACT_AT);
    gain.gain.exponentialRampToValueAtTime(SILENT, t0 + DURATION);
    filter.connect(gain).connect(out);

    for (const [type, ratio, detune] of PAD_VOICES) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(110 * ratio, t0);
      osc.frequency.exponentialRampToValueAtTime(220 * ratio, t0 + IMPACT_AT);
      osc.connect(filter);
      osc.start(t0);
      osc.stop(t0 + DURATION + 0.05);
    }
  }

  // seno caindo de tom (o "tum") + um sopro de ruído grave
  private impact(ctx: AudioContext, out: AudioNode, at: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.32);
    const body = ctx.createGain();
    body.gain.setValueAtTime(SILENT, at);
    body.gain.exponentialRampToValueAtTime(0.4, at + 0.012);
    body.gain.exponentialRampToValueAtTime(SILENT, at + 0.36);
    osc.connect(body).connect(out);
    osc.start(at);
    osc.stop(at + 0.4);

    const air = this.noiseSource(ctx);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1400;
    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.12, at);
    airGain.gain.exponentialRampToValueAtTime(SILENT, at + 0.3);
    air.connect(lowpass).connect(airGain).connect(out);
    air.start(at);
    air.stop(at + 0.32);
  }

  private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    return src;
  }

  // ruído branco gerado uma vez só e reaproveitado
  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise?.sampleRate === ctx.sampleRate) return this.noise;
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }
}
