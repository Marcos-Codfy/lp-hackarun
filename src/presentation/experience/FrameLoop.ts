import { Ticker, type TickCallback } from '@shared/core/Ticker';
import { MotionPauseSignal } from '@presentation/views/motion/MotionPauseSignal';

// contínuo (Ticker compartilhado) ou sob demanda (reduced motion: 1 frame por mudança); pausa com a aba oculta.
// "Pausar animações" (WCAG 2.2.2) congela o relógio: desenha um frame parado e, ao retomar, segue dali sem salto
export class FrameLoop {
  private stopTicker: (() => void) | null = null;
  private pending = 0;
  private started = false;
  private enabled = true;
  // relógio sem o tempo em pausa (s): pausedAt marca o início da pausa atual
  private pausedAt: number | null = null;
  private pausedFor = 0;
  private readonly offPause: () => void;

  constructor(
    private readonly onFrame: TickCallback,
    private readonly continuous: boolean,
    private readonly onResume: () => void = () => {},
  ) {
    document.addEventListener('visibilitychange', this.sync);
    const signal = new MotionPauseSignal();
    if (signal.isPaused()) this.pausedAt = performance.now() / 1000;
    this.offPause = signal.watch(this.setPaused);
  }

  start(): void {
    this.started = true;
    this.sync();
  }

  // pede um frame avulso; no modo contínuo só faz sentido em pausa (resize, troca de efeito)
  invalidate(): void {
    if ((this.continuous && this.pausedAt === null) || this.pending || !this.canRun()) return;
    this.pending = requestAnimationFrame((now) => {
      this.pending = 0;
      this.onFrame(this.clock(now / 1000), 0);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.sync();
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.sync);
    this.offPause();
    this.started = false;
    this.sync();
  }

  private canRun(): boolean {
    return this.started && this.enabled && !document.hidden;
  }

  // em pausa o tempo fica parado no instante da pausa: todo frame avulso sai idêntico
  private clock(time: number): number {
    return (this.pausedAt ?? time) - this.pausedFor;
  }

  private readonly tick: TickCallback = (time, delta) => this.onFrame(this.clock(time), delta);

  private readonly setPaused = (paused: boolean): void => {
    const now = performance.now() / 1000;
    if (paused) this.pausedAt ??= now;
    else if (this.pausedAt !== null) {
      this.pausedFor += now - this.pausedAt;
      this.pausedAt = null;
    }
    this.sync();
  };

  private stopTicking(): void {
    this.stopTicker?.();
    this.stopTicker = null;
  }

  private readonly sync = (): void => {
    if (!this.canRun()) {
      this.stopTicking();
      cancelAnimationFrame(this.pending);
      this.pending = 0;
      return;
    }
    if (!this.continuous || this.pausedAt !== null) {
      this.stopTicking();
      this.invalidate();
      return;
    }
    if (this.stopTicker) return;
    this.onResume();
    this.stopTicker = Ticker.shared.add(this.tick);
  };
}
