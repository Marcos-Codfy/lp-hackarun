import { Color, LinearSRGBColorSpace, Vector3, type Camera } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { PostState } from './PostState';
import { SCENE_LOOKS, type SceneLook } from './SceneLooks';

export interface PostInput {
  weights: Float32Array;
  charge: number;
  flash: number;
  shockPhase: number;
  afterglow: number;
  warp: number;
  velocity: number;
  time: number;
  // centro da forma atual no mundo (foco do flash, do anel e do zoom blur)
  pivot: Vector3;
}

const BASE_ABERRATION = 0.008;
const BASE_GRAIN = 0.05;
const BASE_VIGNETTE = 0.85;

// mistura a luz das cenas com os mesmos pesos do layout e soma os eventos (carga, flash, travessia)
export class PostDirector {
  readonly state = new PostState();
  readonly bokehA = new Color();
  readonly bokehB = new Color();
  stars = 1;
  private readonly looks: SceneLook[];
  private readonly color = new Color();
  private readonly projected = new Vector3();

  constructor(keys: readonly SceneKey[]) {
    this.looks = keys.map((key) => SCENE_LOOKS[key]);
  }

  update(input: PostInput, camera: Camera): void {
    const s = this.state;
    this.blendLooks(input.weights);

    const { charge, flash, afterglow } = input;
    // flash contido: o texto do CTA não pode sumir no estouro
    s.bloomStrength += charge * 0.5 + afterglow * 0.3 + flash * 0.6;
    s.bloomRadius = Math.min(1, s.bloomRadius + flash * 0.1);
    s.exposure *= 1 + charge * 0.15 + afterglow * 0.1 + flash * 0.35;
    s.flash = flash;
    s.aberration =
      BASE_ABERRATION + charge * 0.012 + flash * 0.04 + input.warp * 0.03 + input.velocity * 0.01;
    s.vignette = BASE_VIGNETTE;
    s.grain = BASE_GRAIN;
    s.warp = input.warp;
    s.time = input.time;
    s.shockPhase = input.shockPhase;

    this.projected.copy(input.pivot).project(camera);
    s.focus.set(this.projected.x * 0.5 + 0.5, this.projected.y * 0.5 + 0.5);
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
