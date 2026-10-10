export type TickCallback = (time: number, delta: number) => void;

// um único requestAnimationFrame pro site inteiro (singleton)
export class Ticker {
  private static instance: Ticker | null = null;
  private readonly callbacks = new Set<TickCallback>();
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
    const loop = (now: number) => {
      // delta limitado: aba voltando do background não pode dar salto gigante
      const delta = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.callbacks.forEach((fn) => fn(now / 1000, delta));
      if (this.running) this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }
}
