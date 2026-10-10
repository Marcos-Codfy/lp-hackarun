import { Ticker, type TickCallback } from '@shared/core/Ticker';

// contínuo (Ticker compartilhado) ou sob demanda (reduced motion: 1 frame por mudança); pausa com a aba oculta
export class FrameLoop {
  private stopTicker: (() => void) | null = null;
  private pending = 0;
  private started = false;
  private enabled = true;

  constructor(
    private readonly onFrame: TickCallback,
    private readonly continuous: boolean,
    private readonly onResume: () => void = () => {},
  ) {
    document.addEventListener('visibilitychange', this.sync);
  }

  start(): void {
    this.started = true;
    this.sync();
  }

  // pede um frame avulso; no modo contínuo não precisa
  invalidate(): void {
    if (this.continuous || this.pending || !this.canRun()) return;
    this.pending = requestAnimationFrame((now) => {
      this.pending = 0;
      this.onFrame(now / 1000, 0);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.sync();
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.sync);
    this.started = false;
    this.sync();
  }

  private canRun(): boolean {
    return this.started && this.enabled && !document.hidden;
  }

  private readonly sync = (): void => {
    if (!this.canRun()) {
      this.stopTicker?.();
      this.stopTicker = null;
      cancelAnimationFrame(this.pending);
      this.pending = 0;
      return;
    }
    if (!this.continuous) {
      this.invalidate();
      return;
    }
    if (this.stopTicker) return;
    this.onResume();
    this.stopTicker = Ticker.shared.add(this.onFrame);
  };
}
