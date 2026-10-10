// liga/desliga um loop conforme o elemento está na tela e a aba está visível
export class VisibilityGate {
  private onScreen = true;
  private running = false;
  private observer: IntersectionObserver | null = null;

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
    document.addEventListener('visibilitychange', this.sync);
    this.sync();
  }

  destroy(): void {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.sync);
    if (this.running) this.onChange(false);
    this.running = false;
  }

  private readonly sync = (): void => {
    const next = this.onScreen && !document.hidden;
    if (next === this.running) return;
    this.running = next;
    this.onChange(next);
  };
}
