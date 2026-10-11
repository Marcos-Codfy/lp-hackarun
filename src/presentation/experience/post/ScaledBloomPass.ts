import { Vector2, type Color, type WebGLRenderTarget } from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { PostState } from './PostState';

// peso de cada mip na tinta da cena: os mips finos ficam brancos, os largos puxam a cor
const TINT_WEIGHTS = [0, 0.1, 0.3, 0.5, 0.6] as const;

// UnrealBloomPass com resolução própria (meia no tier médio) e tinta por cena nos halos largos
export class ScaledBloomPass extends UnrealBloomPass {
  private width = 2;
  private height = 2;

  constructor(private scale: number) {
    super(new Vector2(256, 256), 1, 0.5, 0.1);
  }

  override setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    super.setSize(Math.max(2, Math.round(width * this.scale)), Math.max(2, Math.round(height * this.scale)));
  }

  get renderTargets(): WebGLRenderTarget[] {
    return [this.renderTargetBright, ...this.renderTargetsHorizontal, ...this.renderTargetsVertical];
  }

  setScale(scale: number): void {
    if (scale === this.scale) return;
    this.scale = scale;
    this.setSize(this.width, this.height);
  }

  apply(state: PostState): void {
    this.strength = state.bloomStrength;
    this.radius = state.bloomRadius;
    this.threshold = state.bloomThreshold;
    this.tint(state.bloomTint);
  }

  private tint(color: Color): void {
    this.bloomTintColors.forEach((mip, i) => {
      const k = TINT_WEIGHTS[i] ?? 1;
      mip.set(1 + (color.r - 1) * k, 1 + (color.g - 1) * k, 1 + (color.b - 1) * k);
    });
  }
}
