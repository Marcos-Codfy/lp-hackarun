import type { WebGLRenderer } from 'three';
import type { AppContext } from '@presentation/app/AppContext';
import type { QualityTier } from '@presentation/app/AppEvents';
import { CanvasResizer } from './CanvasResizer';
import { FrameLoop } from './FrameLoop';
import { StageRenderer } from './post/StageRenderer';
import { AdaptiveQuality, type QualityTarget } from './quality/AdaptiveQuality';
import type { EffectsLevel, QualityProfile } from './quality/QualityProfile';
import { StageStatus } from './StageStatus';
import { StageWorld, type WorldParts } from './StageWorld';

export interface StageParts extends WorldParts {
  renderer: WebGLRenderer;
  // tier forçado na URL (QA) não se rebaixa sozinho
  adaptive: boolean;
}

// Facade: o resto do app só enxerga start/dispose; aqui fica o ciclo de vida (loop, tamanho, qualidade, contexto)
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

    this.world = new StageWorld(parts, ctx);
    const { scene, camera } = this.world;
    this.output = new StageRenderer(this.renderer, scene, camera, parts.profile.effects, this.onEffects);
    this.world.setEffects(this.output.level);
    this.adaptive =
      this.reduced || !parts.adaptive
        ? null
        : new AdaptiveQuality(parts.profile, this, window.devicePixelRatio || 1);
    this.loop = new FrameLoop(this.frame, !this.reduced, () => this.adaptive?.reset());
    this.resizer = new CanvasResizer(this.renderer.domElement, this.applySize);

    // reduced motion: só desenha quando a cena ou a carga mudam
    if (this.reduced) {
      this.offs.push(ctx.scenes.progress.subscribe(() => this.loop.invalidate(), { immediate: false }));
      this.offs.push(ctx.bus.on('experience:charging', () => this.loop.invalidate()));
    }
    // shader que não compila não lança erro: sem isso o canvas ficaria vazio e o fallback sumiria
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      this.shaderError = true;
      console.error(
        '[experience] shader error',
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertex),
        gl.getShaderInfoLog(fragment),
      );
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  start(onReady: () => void, onFail: (reason: string) => void): void {
    this.status.listen(onReady, onFail);
    this.resizer.measureNow();
    // o shader das partículas é grande: compila em paralelo (KHR_parallel_shader_compile) sem congelar a página
    this.world.setCompiling(true);
    void this.output
      .compile()
      .catch(() => undefined)
      .then(() => {
        this.world.setCompiling(false);
        if (!this.disposed) this.loop.start();
      });
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
    if (this.startTime < 0) this.startTime = time;
    const elapsed = this.reduced ? 0 : time - this.startTime;
    // primeiro frame entra direto na cena atual (recarregar no meio da página não morfa do zero)
    this.world.update(elapsed, delta, this.reduced || !this.status.ready);
    this.output.render(this.world.post, delta);
    if (this.shaderError) {
      this.loop.setEnabled(false);
      this.status.fail('shader-error');
      return;
    }
    this.adaptive?.sample(delta);
    this.status.markReady();
  };

  private readonly onEffects = (level: EffectsLevel): void => {
    this.world.setEffects(level);
    this.loop.invalidate();
  };

  private readonly applySize = (width: number, height: number): void => {
    this.size = { width, height };
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
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
