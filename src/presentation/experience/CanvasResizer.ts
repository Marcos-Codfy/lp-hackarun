const SETTLE_MS = 120;

// ResizeObserver no canvas com debounce: a barra do celular abrindo não realoca o buffer a cada pixel
export class CanvasResizer {
  private readonly observer: ResizeObserver;
  private timer = 0;
  private width = 0;
  private height = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onResize: (width: number, height: number) => void,
  ) {
    this.observer = new ResizeObserver(() => this.schedule());
    this.observer.observe(canvas);
  }

  // leitura síncrona pro primeiro frame já sair no tamanho certo
  measureNow(): void {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.onResize(width, height);
  }

  dispose(): void {
    this.observer.disconnect();
    window.clearTimeout(this.timer);
  }

  private schedule(): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.measureNow(), SETTLE_MS);
  }
}
