import type { TickSound } from '@application/ports/TickSound';
import type { AudioEngine } from './AudioEngine';
import type { AudioSprite } from './AudioSprite';
import type { MinIntervalGate } from './MinIntervalGate';

type FetchFn = (input: string) => Promise<Response>;

export interface TypingSoundOptions {
  sprite: AudioSprite;
  gate: MinIntervalGate;
  gain: number;
  random?: () => number;
  fetchFn?: FetchFn;
}

// cliques de tecla a partir de um sprite: decodifica uma vez, sorteia o slot e varia o tom
export class TypingSound implements TickSound {
  private readonly engine: AudioEngine;
  private readonly url: string;
  private readonly options: TypingSoundOptions;
  private loading: Promise<AudioBuffer | null> | null = null;
  private buffer: AudioBuffer | null = null;

  constructor(engine: AudioEngine, url: string, options: TypingSoundOptions) {
    this.engine = engine;
    this.url = url;
    this.options = options;
  }

  preload(): void {
    void this.load();
  }

  play(): void {
    const ctx = this.engine.context;
    const out = this.engine.output;
    if (!ctx || !out || ctx.state !== 'running') return;
    // ainda decodificando: pula o clique (atrasado soa pior que mudo)
    if (!this.buffer) {
      void this.load();
      return;
    }
    if (!this.options.gate.tryPass(ctx.currentTime * 1000)) return;

    const { slot, rate } = this.options.sprite.pick(this.options.random);
    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = this.options.gain;
    source.connect(gain).connect(out);
    source.addEventListener('ended', () => gain.disconnect(), { once: true });
    source.start(0, slot.offset, slot.duration);
  }

  private load(): Promise<AudioBuffer | null> {
    const ctx = this.engine.context;
    if (!ctx) return Promise.resolve(null);
    const fetchFn = this.options.fetchFn ?? ((u: string) => fetch(u));
    this.loading ??= fetchFn(this.url)
      .then((res) => {
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok || type.includes('text/html')) return null;
        return res.arrayBuffer();
      })
      .then((data) => (data ? ctx.decodeAudioData(data) : null))
      .then((buffer) => (this.buffer = buffer))
      .catch(() => null);
    return this.loading;
  }
}
