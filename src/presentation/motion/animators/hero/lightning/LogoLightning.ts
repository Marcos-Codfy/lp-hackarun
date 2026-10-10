import { clamp } from '@shared/utils/math';
import { BoltFactory, type StageFrame } from './BoltFactory';
import { BoltPainter } from './BoltPainter';
import { LogoContour } from './LogoContour';
import { StrikeScheduler } from './StrikeScheduler';
import { VisibilityGate } from './VisibilityGate';
import type { Bolt } from './types';

export interface LightningDeps {
  canvas: HTMLCanvasElement;
  logo: HTMLImageElement;
  // ganha .is-zapped por um instante a cada descarga grande (o CSS faz o clarão do logo)
  host: HTMLElement;
  lite: boolean;
}

const MAX_DPR = 2;
const MAX_BOLTS = 40;
const ZAP_MS = 110;

// raios procedurais em volta do logo: um canvas 2D pequeno por cima da imagem
// (só roda com o hero na tela e a aba visível)
export class LogoLightning {
  private readonly painter: BoltPainter | null;
  private readonly scheduler: StrikeScheduler;
  private factory: BoltFactory | null = null;
  private gate: VisibilityGate | null = null;
  private resizer: ResizeObserver | null = null;
  private frame: StageFrame | null = null;
  private bolts: Bolt[] = [];
  private raf = 0;
  private zapTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly deps: LightningDeps) {
    const ctx = deps.canvas.getContext('2d');
    this.painter = ctx ? new BoltPainter(ctx, deps.lite) : null;
    this.scheduler = new StrikeScheduler(deps.lite);
  }

  async mount(): Promise<void> {
    if (!this.painter) return;
    await this.whenDecoded(this.deps.logo);
    const contour = LogoContour.sample(this.deps.logo);
    if (contour.length === 0) return;

    this.frame = this.measure();
    this.factory = new BoltFactory(contour, this.frame);
    this.resizer = new ResizeObserver(() => this.onResize());
    this.resizer.observe(this.deps.canvas);
    this.gate = new VisibilityGate(this.deps.host, (running) => (running ? this.start() : this.stop()));
    this.gate.mount();
  }

  destroy(): void {
    this.gate?.destroy();
    this.resizer?.disconnect();
    this.stop();
    clearTimeout(this.zapTimer);
  }

  private start(): void {
    if (this.raf) return;
    this.scheduler.reset(performance.now());
    this.raf = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.bolts = [];
    if (this.frame) this.painter?.clear(this.frame.width, this.frame.height);
  }

  private readonly tick = (now: number): void => {
    this.raf = requestAnimationFrame(this.tick);
    const { painter, factory, frame } = this;
    if (!painter || !factory || !frame) return;

    for (const kind of this.scheduler.due(now)) {
      const bolt = this.bolts.length < MAX_BOLTS ? factory.create(kind, now) : null;
      if (!bolt) continue;
      this.bolts.push(bolt);
      if (kind === 'strike') this.zap();
    }

    painter.clear(frame.width, frame.height);
    this.bolts = this.bolts.filter((bolt) => {
      const state = StrikeScheduler.frame(bolt, now);
      if (state) painter.paint(bolt, state.alpha, frame.scale, state.restrike);
      return state !== null;
    });
  };

  private zap(): void {
    const { host } = this.deps;
    host.classList.add('is-zapped');
    clearTimeout(this.zapTimer);
    this.zapTimer = setTimeout(() => host.classList.remove('is-zapped'), ZAP_MS);
  }

  private onResize(): void {
    this.frame = this.measure();
    this.factory?.resize(this.frame);
    // geometria antiga ficaria torta no tamanho novo
    this.bolts = [];
  }

  // medidas de layout (offset*), não getBoundingClientRect: as animações de entrada não distorcem
  private measure(): StageFrame {
    const { canvas, logo } = this.deps;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(canvas.offsetWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.offsetHeight * dpr));
    return {
      ox: (logo.offsetLeft - canvas.offsetLeft) * dpr,
      oy: (logo.offsetTop - canvas.offsetTop) * dpr,
      w: logo.offsetWidth * dpr,
      h: logo.offsetHeight * dpr,
      width: canvas.width,
      height: canvas.height,
      scale: dpr * clamp(logo.offsetWidth / 760, 0.8, 1.35),
    };
  }

  private whenDecoded(img: HTMLImageElement): Promise<void> {
    if (img.complete && img.naturalWidth > 0) return img.decode().catch(() => undefined);
    return new Promise((resolve) => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    });
  }
}
