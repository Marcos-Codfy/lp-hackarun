type AudioContextCtor = typeof AudioContext;

const MASTER_VOLUME = 0.5;

// dono único do AudioContext: cria tarde, só depois de um gesto do usuário (política de autoplay)
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  get isSupported(): boolean {
    return AudioEngine.ctor() !== null;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get output(): AudioNode | null {
    return this.master;
  }

  get isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  // tem que ser chamado direto do handler de clique/tecla, sem await antes
  unlock(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx) return Promise.resolve(false);
    this.primeIos(ctx);
    if (ctx.state === 'running') return Promise.resolve(true);
    return ctx
      .resume()
      .then(() => true)
      .catch(() => false);
  }

  // som desligado: suspende pra não gastar bateria à toa
  suspend(): void {
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => undefined);
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = AudioEngine.ctor();
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
      this.master = null;
    }
    return this.ctx;
  }

  // iOS só destrava de verdade tocando algo dentro do gesto: um buffer mudo resolve
  private primeIos(ctx: AudioContext): void {
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // sem problema, é só um empurrão
    }
  }

  private static ctor(): AudioContextCtor | null {
    if (typeof window === 'undefined') return null;
    // safari antigo só tem o prefixado
    const w = window as typeof window & {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  }
}
