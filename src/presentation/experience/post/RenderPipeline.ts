import type { Camera, Material, Scene, WebGLRenderer, WebGLRenderTarget } from 'three';
import type { EffectsLevel } from '../quality/QualityProfile';
import type { PostState } from './PostState';

// Strategy de render: direto (tier baixo) ou com composer (bloom + passe de lente)
export interface RenderPipeline {
  readonly level: EffectsLevel;
  // onde a cena é desenhada: a compilação adiantada precisa do mesmo alvo (o three troca o programa por alvo)
  readonly sceneTarget: WebGLRenderTarget | null;
  // materiais de tela cheia do pós (fora da cena): por alvo de render, pra compilar adiantado também
  passMaterials(): { offscreen: Material[]; screen: Material[] };
  setSize(width: number, height: number, dpr: number): void;
  render(state: PostState, delta: number): void;
  dispose(): void;
}

// sem pós: o sprite carrega o halo fake e o anel de choque vem da malha 3D
export class DirectPipeline implements RenderPipeline {
  readonly level = 'off';
  readonly sceneTarget = null;

  passMaterials(): { offscreen: Material[]; screen: Material[] } {
    return { offscreen: [], screen: [] };
  }

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
  ) {}

  setSize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {}
}
