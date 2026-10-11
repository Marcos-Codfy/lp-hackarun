import { nextPaint, yieldToMain } from '@presentation/app/BootQueue';
import { BoltFactory, type StageFrame } from './BoltFactory';
import { BoltPainter } from './BoltPainter';
import { ContourSource } from './ContourSource';
import { measureStage } from './measureStage';
import { StrikeScheduler } from './StrikeScheduler';
import { VisibilityGate } from './VisibilityGate';
import type { Bolt, BoltKind } from './types';

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
// raios novos por frame: a rajada de largada (~10 de uma vez) se espalha por alguns frames
const SPAWN_PER_FRAME = 3;
// fila curta: em frame lento os mais velhos caem em vez de acumular
const MAX_QUEUED = 12;

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
  private queued: BoltKind[] = [];
  private raf = 0;
  private destroyed = false;
  private zapTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly deps: LightningDeps) {
    const ctx = deps.canvas.getContext('2d');
    this.painter = ctx ? new BoltPainter(ctx, deps.lite) : null;
    this.scheduler = new StrikeScheduler(deps.lite);
  }

  async mount(): Promise<void> {
    if (!this.painter) return;
    await this.whenDecoded(this.deps.logo);
    const contour = await ContourSource.sample(this.deps.logo);
    if (contour.length === 0) return;

    // cada etapa numa tarefa: a medida logo depois de um frame (layout limpo), o resto em seguida
    await nextPaint();
    if (this.destroyed) return;
    this.frame = measureStage(this.deps.canvas, this.deps.logo, MAX_DPR);
    this.factory = new BoltFactory(contour, this.frame);
    // o 1º desenho aloca o canvas na GPU (pode travar): aqui, e não no 1º frame da animação
    this.painter.clear(this.frame.width, this.frame.height);
    await yieldToMain();
    if (this.destroyed) return;
    this.resizer = new ResizeObserver(() => this.onResize());
    this.resizer.observe(this.deps.canvas);
    this.gate = new VisibilityGate(this.deps.host, (running) => (running ? this.start() : this.stop()));
    this.gate.mount();
  }

  destroy(): void {
    this.destroyed = true;
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
    this.queued = [];
    if (this.frame) this.painter?.clear(this.frame.width, this.frame.height);
  }

  private readonly tick = (now: number): void => {
    this.raf = requestAnimationFrame(this.tick);
    const { painter, factory, frame } = this;
    if (!painter || !factory || !frame) return;

    this.queued.push(...this.scheduler.due(now));
    if (this.queued.length > MAX_QUEUED) this.queued.splice(0, this.queued.length - MAX_QUEUED);
    for (const kind of this.queued.splice(0, SPAWN_PER_FRAME)) {
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
    this.frame = measureStage(this.deps.canvas, this.deps.logo, MAX_DPR);
    this.factory?.resize(this.frame);
    // geometria antiga ficaria torta no tamanho novo
    this.bolts = [];
  }

  private whenDecoded(img: HTMLImageElement): Promise<void> {
    if (img.complete && img.naturalWidth > 0) return img.decode().catch(() => undefined);
    return new Promise((resolve) => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    });
  }
}
