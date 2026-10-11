import type { WebGLRenderer } from 'three';
import type { AppContext } from '@presentation/app/AppContext';
import type { QualityTier } from '@presentation/app/AppEvents';
import { CanvasResizer, pixelRatioFor } from './CanvasResizer';
import { FrameLoop } from './FrameLoop';
import { logShaderError } from './post/shaderError';
import type { StageRenderer } from './post/StageRenderer';
import { AdaptiveQuality, type QualityTarget } from './quality/AdaptiveQuality';
import type { EffectsLevel, QualityProfile } from './quality/QualityProfile';
import { StageStatus } from './StageStatus';
import type { StageWorld } from './StageWorld';
import { yieldToMain } from './yieldToMain';

export interface StageParts {
  renderer: WebGLRenderer;
  world: StageWorld;
  output: StageRenderer;
  profile: QualityProfile;
  // tier forçado na URL (QA) não se rebaixa sozinho
  adaptive: boolean;
}

// Facade: o resto do app só enxerga start/dispose; aqui fica o ciclo de vida (loop, tamanho, qualidade, contexto).
// O boot (compile → warm → start) vem em passos curtos, cada um na sua tarefa
export class ExperienceStage implements QualityTarget {
  readonly tier: QualityTier;
  private readonly renderer: WebGLRenderer;
  private readonly world: StageWorld;
  private readonly output: StageRenderer;
  private readonly status = new StageStatus();
  private readonly adaptive: AdaptiveQuality | null;
  private readonly loop: FrameLoop;
  private readonly resizer: CanvasResizer;
  private readonly reduced: boolean;
  private readonly offs: (() => void)[] = [];
  private dprCap: number;
  private size = { width: 1, height: 1 };
  private startTime = -1;
  private shaderError = false;
  private disposed = false;

  constructor(parts: StageParts, ctx: AppContext) {
    this.renderer = parts.renderer;
    this.tier = parts.profile.tier;
    this.reduced = ctx.reducedMotion;
    this.dprCap = parts.profile.maxDpr;

    this.world = parts.world;
    this.output = parts.output;
    this.output.onLevelChange(this.onEffects);
    this.world.setEffects(this.output.level);
    this.adaptive =
      this.reduced || !parts.adaptive
        ? null
        : new AdaptiveQuality(parts.profile, this, window.devicePixelRatio || 1);
    this.loop = new FrameLoop(this.frame, !this.reduced, () => this.adaptive?.reset());
    this.resizer = new CanvasResizer(this.renderer.domElement, this.applySize);

    // loop parado (reduced motion ou "pausar animações"): desenha sob demanda quando a cena ou a carga mudam.
    // com o loop rodando o invalidate não faz nada
    this.offs.push(ctx.scenes.progress.subscribe(() => this.loop.invalidate(), { immediate: false }));
    this.offs.push(ctx.bus.on('experience:charging', () => this.loop.invalidate()));
    // shader que não compila não lança erro: sem isso o canvas ficaria vazio e o fallback sumiria
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      this.shaderError = true;
      logShaderError(gl, program, vertex, fragment);
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  // tamanho real + programas na fila da GPU (em paralelo, KHR_parallel_shader_compile); resolve quando
  // todos estão linkados
  async compile(): Promise<void> {
    this.resizer.measureNow();
    await yieldToMain();
    await this.output.compile();
  }

  // já com as formas no lugar: 1º uso dos programas, upload dos buffers e 1º desenho, fora do 1º frame.
  // programa que não linkou vira o mesmo shader-error do 1º frame
  async warm(): Promise<void> {
    this.world.setPriming(true);
    try {
      if (!(await this.output.warm())) this.shaderError = true;
    } finally {
      this.world.setPriming(false);
    }
  }

  start(onReady: () => void, onFail: (reason: string) => void): void {
    this.status.listen(onReady, onFail);
    if (!this.disposed) this.loop.start();
  }

  degradeEffects(): boolean {
    return this.output.degrade();
  }

  setPixelRatioCap(cap: number): void {
    this.dprCap = cap;
    this.applySize(this.size.width, this.size.height);
  }

  setProfile(profile: QualityProfile): void {
    this.world.setProfile(profile);
    this.output.limit(profile.effects);
  }

  dispose(): void {
    this.disposed = true;
    this.loop.dispose();
    this.resizer.dispose();
    this.offs.forEach((off) => off());
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.world.dispose();
    this.output.dispose();
    this.renderer.dispose();
    this.status.hide();
  }

  private readonly frame = (time: number, delta: number): void => {
    try {
      this.draw(time, delta);
    } catch (error) {
      // erro de JS no frame: o Ticker isola, mas ficaria o canvas congelado por cima da aurora
      console.error('[experience] frame failed', error);
      this.loop.setEnabled(false);
      this.status.fail('frame-error');
    }
  };

  private draw(time: number, delta: number): void {
    if (this.startTime < 0) this.startTime = time;
    const elapsed = this.reduced ? 0 : time - this.startTime;
    // 1º frame e frame avulso (delta 0: reduced/pausado) entram direto na cena atual, sem morfar do zero
    this.world.update(elapsed, delta, this.reduced || delta === 0 || !this.status.ready);
    this.output.render(this.world.post, delta);
    if (this.shaderError) {
      this.loop.setEnabled(false);
      this.status.fail('shader-error');
      return;
    }
    this.adaptive?.sample(delta);
    this.status.markReady();
  }

  private readonly onEffects = (level: EffectsLevel): void => {
    this.world.setEffects(level);
    this.loop.invalidate();
  };

  private readonly applySize = (width: number, height: number): void => {
    this.size = { width, height };
    const dpr = pixelRatioFor(this.dprCap);
    this.output.setSize(width, height, dpr);
    this.world.resize(width, height, dpr);
    this.loop.invalidate();
  };

  // GPU reiniciou: volta o brilho em CSS até o three restaurar o contexto
  private readonly onContextLost = (): void => {
    this.status.hide();
    this.loop.setEnabled(false);
  };

  private readonly onContextRestored = (): void => {
    if (!this.status.failed) this.loop.setEnabled(true);
  };
}
