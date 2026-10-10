import {
  Mesh,
  PlaneGeometry,
  Scene,
  type Camera,
  type Material,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { cheaperEffects, lowerEffects, type EffectsLevel } from '../quality/QualityProfile';
import { ComposerPipeline } from './ComposerPipeline';
import type { PostState } from './PostState';
import { DirectPipeline, type RenderPipeline } from './RenderPipeline';

// troca de pipeline em tempo de execução (FPS caiu, tier baixou) sem o resto do palco saber
export class StageRenderer {
  private pipeline: RenderPipeline;
  private width = 1;
  private height = 1;
  private dpr = 1;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
    level: EffectsLevel,
    // avisa quem depende do nível nas trocas (o sprite liga o halo fake sem bloom)
    private readonly onLevel: (level: EffectsLevel) => void,
  ) {
    this.pipeline = this.create(level);
  }

  get level(): EffectsLevel {
    return this.pipeline.level;
  }

  // compila tudo em paralelo já com o alvo certo (senão o 1º frame recompila e trava a página)
  async compile(): Promise<void> {
    const target = this.pipeline.sceneTarget;
    const { offscreen, screen } = this.pipeline.passMaterials();
    await this.compileOn(this.scene, target);
    await Promise.all([this.compileQuads(offscreen, target), this.compileQuads(screen, null)]);
  }

  private async compileOn(scene: Scene, target: WebGLRenderTarget | null): Promise<void> {
    this.renderer.setRenderTarget(target);
    try {
      await this.renderer.compileAsync(scene, this.camera);
    } finally {
      this.renderer.setRenderTarget(null);
    }
  }

  // os quads do pós vivem fora da cena: uma cena descartável só pra enfileirar os programas
  private async compileQuads(materials: Material[], target: WebGLRenderTarget | null): Promise<void> {
    if (materials.length === 0) return;
    // sem normal, igual ao triângulo do FullScreenQuad (normal muda a chave do programa)
    const geometry = new PlaneGeometry(2, 2).deleteAttribute('normal');
    const scene = new Scene();
    materials.forEach((material) => scene.add(new Mesh(geometry, material)));
    await this.compileOn(scene, target);
    geometry.dispose();
  }

  setSize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.pipeline.setSize(width, height, dpr);
  }

  render(state: PostState, delta: number): void {
    this.pipeline.render(state, delta);
  }

  // um degrau abaixo; false quando já está no render direto
  degrade(): boolean {
    const next = lowerEffects(this.level);
    if (!next) return false;
    this.switchTo(next);
    return true;
  }

  // teto vindo do tier (nunca religa o que o FPS derrubou)
  limit(level: EffectsLevel): void {
    const next = cheaperEffects(this.level, level);
    if (next !== this.level) this.switchTo(next);
  }

  dispose(): void {
    this.pipeline.dispose();
  }

  private switchTo(level: EffectsLevel): void {
    const current = this.pipeline;
    // full → half reaproveita o composer: só encolhe os buffers do bloom
    if (current instanceof ComposerPipeline && level === 'half' && current.reduce()) {
      this.onLevel(level);
      return;
    }
    current.dispose();
    this.pipeline = this.create(level);
    this.pipeline.setSize(this.width, this.height, this.dpr);
    this.onLevel(level);
  }

  private create(level: EffectsLevel): RenderPipeline {
    if (level === 'off') return new DirectPipeline(this.renderer, this.scene, this.camera);
    return new ComposerPipeline(this.renderer, this.scene, this.camera, level);
  }
}
