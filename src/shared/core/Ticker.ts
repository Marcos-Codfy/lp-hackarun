export type TickCallback = (time: number, delta: number) => void;

// um único requestAnimationFrame pro site inteiro (singleton)
export class Ticker {
  private static instance: Ticker | null = null;
  private readonly callbacks = new Set<TickCallback>();
  // loga só a 1ª falha de cada callback: um erro por frame afogaria o console
  private readonly reported = new WeakSet<TickCallback>();
  private frame = 0;
  private last = 0;
  private running = false;

  private constructor() {}

  static get shared(): Ticker {
    Ticker.instance ??= new Ticker();
    return Ticker.instance;
  }

  add(fn: TickCallback): () => void {
    this.callbacks.add(fn);
    if (!this.running) this.start();
    return () => {
      this.callbacks.delete(fn);
      if (this.callbacks.size === 0) this.stop();
    };
  }

  private start(): void {
    this.running = true;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  // agenda o próximo frame antes de rodar os callbacks: um que lança não mata o loop de todo mundo
  // (e o stop de quem sair durante o frame cancela esse agendamento)
  private readonly loop = (now: number): void => {
    this.frame = requestAnimationFrame(this.loop);
    // delta limitado: aba voltando do background não pode dar salto gigante
    const delta = Math.min(Math.max((now - this.last) / 1000, 0), 0.1);
    this.last = now;
    const time = now / 1000;
    this.callbacks.forEach((fn) => this.run(fn, time, delta));
  };

  private run(fn: TickCallback, time: number, delta: number): void {
    try {
      fn(time, delta);
    } catch (error) {
      if (this.reported.has(fn)) return;
      this.reported.add(fn);
      console.error('[ticker] callback failed', error);
    }
  }
}
