import { MotionPauseSignal } from '@presentation/views/motion/MotionPauseSignal';

// liga/desliga um loop conforme o elemento está na tela, a aba está visível e as animações não estão pausadas
export class VisibilityGate {
  private onScreen = true;
  private paused = false;
  private running = false;
  private observer: IntersectionObserver | null = null;
  private offPause: (() => void) | null = null;

  constructor(
    private readonly target: Element,
    private readonly onChange: (running: boolean) => void,
  ) {}

  mount(): void {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        this.onScreen = entries.some((entry) => entry.isIntersecting);
        this.sync();
      });
      this.observer.observe(this.target);
    }
    const signal = new MotionPauseSignal();
    this.paused = signal.isPaused();
    this.offPause = signal.watch((paused) => {
      this.paused = paused;
      this.sync();
    });
    document.addEventListener('visibilitychange', this.sync);
    this.sync();
  }

  destroy(): void {
    this.observer?.disconnect();
    this.offPause?.();
    document.removeEventListener('visibilitychange', this.sync);
    if (this.running) this.onChange(false);
    this.running = false;
  }

  private readonly sync = (): void => {
    const next = this.onScreen && !document.hidden && !this.paused;
    if (next === this.running) return;
    this.running = next;
    this.onChange(next);
  };
}
