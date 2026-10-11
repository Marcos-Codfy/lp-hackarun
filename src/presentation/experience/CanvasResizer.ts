const SETTLE_MS = 120;

// DPR efetivo: o do aparelho, limitado pelo teto do tier
export const pixelRatioFor = (cap: number): number => Math.min(window.devicePixelRatio || 1, cap);

const cssSizeOf = (canvas: HTMLCanvasElement): { width: number; height: number } => ({
  width: Math.max(1, canvas.clientWidth || window.innerWidth),
  height: Math.max(1, canvas.clientHeight || window.innerHeight),
});

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

  // antes do contexto existir mudar o tamanho é de graça; depois, cada mudança realoca o buffer de desenho
  // (síncrono na GPU). Mesma conta do setDrawingBufferSize do three: acertou o tier, o resize vira no-op
  static presize(canvas: HTMLCanvasElement, dprCap: number): void {
    const { width, height } = cssSizeOf(canvas);
    const dpr = pixelRatioFor(dprCap);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  // leitura síncrona pro primeiro frame já sair no tamanho certo
  measureNow(): void {
    const { width, height } = cssSizeOf(this.canvas);
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
