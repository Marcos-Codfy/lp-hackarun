import type { Camera, Material, Scene, WebGLRenderer, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import type { RenderPipeline } from './RenderPipeline';
import { CinematicPass } from './CinematicPass';
import type { PostState } from './PostState';
import { ScaledBloomPass } from './ScaledBloomPass';

const BLOOM_SCALE = { full: 1, half: 0.5 } as const;

// cena → bloom → lente; buffers HalfFloat guardam o excesso de luz aditiva pro ombro suave do passe final
export class ComposerPipeline implements RenderPipeline {
  private readonly composer: EffectComposer;
  private readonly bloom: ScaledBloomPass;
  private readonly lens = new CinematicPass();

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    public level: 'full' | 'half',
  ) {
    this.composer = new EffectComposer(renderer);
    this.bloom = new ScaledBloomPass(BLOOM_SCALE[level]);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.lens);
  }

  get sceneTarget(): WebGLRenderTarget {
    return this.composer.readBuffer;
  }

  passMaterials(): { offscreen: Material[]; screen: Material[] } {
    const bloom = this.bloom;
    return {
      offscreen: [
        bloom.materialHighPassFilter,
        ...bloom.separableBlurMaterials,
        bloom.compositeMaterial,
        bloom.blendMaterial,
      ],
      screen: [this.lens.material],
    };
  }

  // full → half; devolve false quando já está no mínimo do composer
  reduce(): boolean {
    if (this.level !== 'full') return false;
    this.level = 'half';
    this.bloom.setScale(BLOOM_SCALE.half);
    return true;
  }

  setSize(width: number, height: number, dpr: number): void {
    const renderer = this.composer.renderer;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);
  }

  render(state: PostState, delta: number): void {
    this.bloom.apply(state);
    this.lens.apply(state);
    this.composer.render(delta);
  }

  dispose(): void {
    this.bloom.dispose();
    this.lens.dispose();
    this.composer.dispose();
  }
}
