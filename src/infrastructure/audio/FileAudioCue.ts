import type { AudioCue } from '@application/ports/AudioCue';
import type { AudioEngine } from './AudioEngine';

type FetchFn = (input: string) => Promise<Response>;

// toca o arquivo do cue; se não existir (404, html de fallback, decode quebrado) cai no sintetizado
export class FileAudioCue implements AudioCue {
  private readonly engine: AudioEngine;
  private readonly url: string;
  private readonly fallback: AudioCue;
  private readonly fetchFn: FetchFn;
  private buffer: Promise<AudioBuffer | null> | null = null;

  constructor(engine: AudioEngine, url: string, fallback: AudioCue, fetchFn: FetchFn = (u) => fetch(u)) {
    this.engine = engine;
    this.url = url;
    this.fallback = fallback;
    this.fetchFn = fetchFn;
  }

  // chamado logo depois do unlock pra não ter atraso na hora do pico
  preload(): void {
    void this.load();
  }

  async play(): Promise<void> {
    const ctx = this.engine.context;
    const out = this.engine.output;
    if (!ctx || !out || ctx.state !== 'running') return;
    const buffer = await this.load();
    if (!buffer) return this.fallback.play();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(out);
    source.start();
  }

  private load(): Promise<AudioBuffer | null> {
    const ctx = this.engine.context;
    if (!ctx) return Promise.resolve(null);
    this.buffer ??= this.fetchFn(this.url)
      .then((res) => {
        const type = res.headers.get('content-type') ?? '';
        // pages devolve o index.html com 200 pra rota inexistente: não é áudio
        if (!res.ok || type.includes('text/html')) return null;
        return res.arrayBuffer();
      })
      .then((data) => (data ? ctx.decodeAudioData(data) : null))
      .catch(() => null);
    return this.buffer;
  }
}
