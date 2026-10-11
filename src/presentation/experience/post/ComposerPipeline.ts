import type { Camera, Material, Scene, WebGLRenderer, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import type { RenderPipeline } from './RenderPipeline';
import { scenePrimeSteps } from './scenePrime';
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
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
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

  // os alvos alocados vazios, cada objeto da cena no buffer de leitura e o pós em duas passadas (só a
  // lente, depois com o bloom): o 1º uso de cada coisa numa tarefa. Nada aparece, o canvas está invisível
  primeSteps(): (() => void)[] {
    const renderer = this.renderer;
    const { readBuffer, writeBuffer } = this.composer;
    const targets = [readBuffer, writeBuffer, ...this.bloom.renderTargets];
    return [
      () => targets.forEach((target) => renderer.initRenderTarget(target)),
      ...scenePrimeSteps(renderer, this.scene, this.camera, readBuffer),
      () => {
        this.bloom.enabled = false;
        try {
          this.composer.render(0);
        } finally {
          this.bloom.enabled = true;
        }
      },
      () => this.composer.render(0),
    ];
  }

  // full → half; devolve false quando já está no mínimo do composer
  reduce(): boolean {
    if (this.level !== 'full') return false;
    this.level = 'half';
    this.bloom.setScale(BLOOM_SCALE.half);
    return true;
  }

  setSize(width: number, height: number, dpr: number): void {
    // um ajuste só no canvas (setPixelRatio + setSize realocavam o buffer de desenho duas vezes)
    this.renderer.setDrawingBufferSize(width, height, dpr);
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
