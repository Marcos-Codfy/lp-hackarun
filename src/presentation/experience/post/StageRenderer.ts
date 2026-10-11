import type { Camera, Scene, WebGLRenderer } from 'three';
import { cheaperEffects, lowerEffects, type EffectsLevel } from '../quality/QualityProfile';
import { gpuSettled } from '../GpuContext';
import { TaskBudget } from '../TaskBudget';
import { ComposerPipeline } from './ComposerPipeline';
import type { PostState } from './PostState';
import { DirectPipeline, type RenderPipeline } from './RenderPipeline';
import { StageCompiler } from './StageCompiler';

// troca de pipeline em tempo de execução (FPS caiu, tier baixou) sem o resto do palco saber
export class StageRenderer {
  private pipeline: RenderPipeline;
  // o próximo, compilando em paralelo; até ficar pronto o atual segue desenhando
  private pending: RenderPipeline | null = null;
  private readonly compiler: StageCompiler;
  // avisa quem depende do nível nas trocas (o sprite liga o halo fake sem bloom)
  private onLevel: (level: EffectsLevel) => void = () => {};
  private width = 1;
  private height = 1;
  private dpr = 1;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
    level: EffectsLevel,
  ) {
    this.compiler = new StageCompiler(renderer, camera);
    this.pipeline = this.create(level);
  }

  get level(): EffectsLevel {
    return this.pipeline.level;
  }

  // pra onde está indo: os próximos cortes partem daqui
  private get target(): EffectsLevel {
    return this.pending?.level ?? this.pipeline.level;
  }

  onLevelChange(listener: (level: EffectsLevel) => void): void {
    this.onLevel = listener;
  }

  // compila tudo antes do 1º frame (senão ele recompila e trava a página)
  async compile(): Promise<void> {
    await this.compiler.compile(this.scene, this.pipeline);
  }

  // o que o 1º frame faria de uma vez, em tarefas separadas: 1º uso dos programas, depois buffers e alvos.
  // O 1º desenho de cada programa ainda dá trabalho pro driver; a fence espera a GPU dar conta disso sem
  // travar (senão o 1º frame ficava preso atrás). false = algum programa não linkou
  async warm(): Promise<boolean> {
    const linked = await this.compiler.warm();
    const budget = new TaskBudget();
    for (const step of this.pipeline.primeSteps()) {
      step();
      await budget.next();
    }
    await gpuSettled(this.renderer.getContext() as WebGL2RenderingContext);
    return linked;
  }

  setSize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.pipeline.setSize(width, height, dpr);
    this.pending?.setSize(width, height, dpr);
  }

  render(state: PostState, delta: number): void {
    this.pipeline.render(state, delta);
  }

  // um degrau abaixo; false quando já está (ou já vai) no render direto
  degrade(): boolean {
    const next = lowerEffects(this.target);
    if (!next) return false;
    this.switchTo(next);
    return true;
  }

  // teto vindo do tier (nunca religa o que o FPS derrubou)
  limit(level: EffectsLevel): void {
    const next = cheaperEffects(this.target, level);
    if (next !== this.target) this.switchTo(next);
  }

  dispose(): void {
    this.pending?.dispose();
    this.pending = null;
    this.pipeline.dispose();
  }

  private switchTo(level: EffectsLevel): void {
    const current = this.pipeline;
    // full → half reaproveita o composer: só encolhe os buffers do bloom (mesmos programas, troca na hora)
    if (!this.pending && current instanceof ComposerPipeline && level === 'half' && current.reduce()) {
      this.onLevel(level);
      return;
    }
    this.pending?.dispose();
    const next = this.create(level);
    next.setSize(this.width, this.height, this.dpr);
    this.pending = next;
    void this.prepare(next);
  }

  // o render direto vai pra tela, e na tela a chave do programa é outra: trocar na hora compilava o shader
  // das partículas na thread principal (segundos de página congelada). Programa que não linkou: fica o atual
  private async prepare(next: RenderPipeline): Promise<void> {
    try {
      const programs = await this.compiler.compile(this.scene, next);
      if (this.pending === next && (await this.compiler.warm(programs))) this.adopt(next);
    } catch (error) {
      console.error('[experience] pipeline switch failed', error);
    }
    if (this.pending === next) {
      this.pending = null;
      next.dispose();
    }
  }

  private adopt(next: RenderPipeline): void {
    // outro corte ou o dispose chegaram antes
    if (this.pending !== next) return;
    this.pending = null;
    this.pipeline.dispose();
    this.pipeline = next;
    this.onLevel(next.level);
  }

  private create(level: EffectsLevel): RenderPipeline {
    if (level === 'off') return new DirectPipeline(this.renderer, this.scene, this.camera);
    return new ComposerPipeline(this.renderer, this.scene, this.camera, level);
  }
}
