import { Color, LinearSRGBColorSpace, Vector3, type PerspectiveCamera } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { PostState } from './PostState';
import { SCENE_LOOKS, type SceneLook } from './SceneLooks';

export interface PostInput {
  weights: Float32Array;
  charge: number;
  swell: number;
  shockPhase: number;
  afterglow: number;
  warp: number;
  velocity: number;
  time: number;
  // centro da forma atual no mundo (foco do anel e do zoom blur) e raio do globo no mundo
  pivot: Vector3;
  radius: number;
}

const BASE_ABERRATION = 0.008;
const BASE_GRAIN = 0.05;
const BASE_VIGNETTE = 0.85;
// teto do que a carga soma na luz: título, contador e CTA ficam por cima do globo e não podem lavar
export const MAX_CHARGE_BLOOM = 0.3;
export const MAX_CHARGE_EXPOSURE = 0.08;

// mistura a luz das cenas com os mesmos pesos do layout e soma os eventos (carga, pulso, travessia)
export class PostDirector {
  readonly state = new PostState();
  readonly bokehA = new Color();
  readonly bokehB = new Color();
  stars = 1;
  private readonly looks: SceneLook[];
  private readonly color = new Color();
  private readonly projected = new Vector3();
  private readonly edge = new Vector3();

  constructor(keys: readonly SceneKey[]) {
    this.looks = keys.map((key) => SCENE_LOOKS[key]);
  }

  update(input: PostInput, camera: PerspectiveCamera): void {
    const s = this.state;
    this.blendLooks(input.weights);

    const { charge, swell, afterglow } = input;
    s.bloomStrength += Math.min(MAX_CHARGE_BLOOM, charge * 0.28 + afterglow * 0.1 + swell * 0.22);
    s.exposure *= 1 + Math.min(MAX_CHARGE_EXPOSURE, charge * 0.06 + afterglow * 0.02 + swell * 0.06);
    s.aberration = BASE_ABERRATION + charge * 0.006 + input.warp * 0.03 + input.velocity * 0.01;
    s.vignette = BASE_VIGNETTE;
    s.grain = BASE_GRAIN;
    s.warp = input.warp;
    s.time = input.time;
    s.shockPhase = input.shockPhase;

    this.projected.copy(input.pivot).project(camera);
    s.focus.set(this.projected.x * 0.5 + 0.5, this.projected.y * 0.5 + 0.5);
    if (input.shockPhase >= 0) s.shockRadius = this.screenRadius(input.pivot, input.radius, camera);
  }

  // raio do globo na tela (em alturas de tela, a unidade do passe de lente): a onda nasce na silhueta
  private screenRadius(pivot: Vector3, radius: number, camera: PerspectiveCamera): number {
    const edge = this.edge.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(radius).add(pivot);
    edge.project(camera);
    const dx = (edge.x - this.projected.x) * 0.5 * camera.aspect;
    const dy = (edge.y - this.projected.y) * 0.5;
    return Math.hypot(dx, dy);
  }

  private blendLooks(weights: Float32Array): void {
    const s = this.state;
    s.bloomStrength = 0;
    s.bloomRadius = 0;
    s.bloomThreshold = 0;
    s.exposure = 0;
    s.bloomTint.setRGB(0, 0, 0);
    this.bokehA.setRGB(0, 0, 0);
    this.bokehB.setRGB(0, 0, 0);
    this.stars = 0;
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i] ?? 0;
      const look = this.looks[i];
      if (w < 1e-4 || !look) continue;
      total += w;
      s.bloomStrength += look.bloom * w;
      s.bloomRadius += look.radius * w;
      s.bloomThreshold += look.threshold * w;
      s.exposure += look.exposure * w;
      this.stars += look.stars * w;
      this.addColor(s.bloomTint, look.tint, w);
      this.addColor(this.bokehA, look.bokeh[0], w);
      this.addColor(this.bokehB, look.bokeh[1], w);
    }
    if (total > 0) return;
    // sem pesos ainda (primeiro frame): luz neutra
    s.bloomStrength = 1;
    s.bloomRadius = 0.6;
    s.bloomThreshold = 0.06;
    s.exposure = 1;
    s.bloomTint.setRGB(1, 1, 1);
    this.stars = 1;
  }

  private addColor(target: Color, hex: number, w: number): void {
    // hex cru (o shader trabalha direto em sRGB)
    this.color.setHex(hex, LinearSRGBColorSpace);
    target.r += this.color.r * w;
    target.g += this.color.g * w;
    target.b += this.color.b * w;
  }
}
