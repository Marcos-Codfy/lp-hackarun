import type { Object3D } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { SHAPE_RADIUS } from '../shapes/ShapeStrategy';

// pose por cena: x, y, z, escala, rotX, rotY, rotZ, opacidade
type Pose = readonly [number, number, number, number, number, number, number, number];
type PoseFn = (hw: number, hh: number) => Pose;

const STRIDE = 8;
const fit = (radius: number): number => radius / SHAPE_RADIUS;

// paisagem: forma ao lado do texto quando a seção tem conteúdo à esquerda
const WIDE: Record<SceneKey, PoseFn> = {
  core: (hw, hh) => [0, 0, 0, fit(Math.min(0.8 * hh, 0.62 * hw)), 0, 0, 0, 1],
  nebula: (hw, hh) => [0, -0.05 * hh, -0.6, fit(hw * 1.25), -1.0, 0, 0.3, 0.55],
  enigma: (hw, hh) => [0.48 * hw, 0.02 * hh, 0, fit(Math.min(0.78 * hh, 0.4 * hw)), 0, -0.3, 0.06, 0.9],
  route: (hw, hh) => [0, -0.14 * hh, 0, fit(hw * 1.06), 0, 0, -0.02, 1],
  arena: (hw, hh) => [0, -0.58 * hh, 0.2, fit(hw * 1.15), 0.12, 0, 0, 0.7],
  screen: (hw, hh) => [0.4 * hw, 0.04 * hh, 0, fit(Math.min(0.95 * hh, 0.5 * hw)), 0, -0.38, 0, 0.85],
  trophy: (hw, hh) => [0.48 * hw, 0, 0, fit(Math.min(0.72 * hh, 0.4 * hw)), 0.05, 0, 0, 0.95],
  dust: (hw, hh) => [0, 0, 0, fit(Math.max(hw, hh) * 1.2), 0, 0, 0, 0.32],
};

// retrato: tudo centralizado, menor e mais apagado atrás do texto; a rota vira vertical
const TALL: Record<SceneKey, PoseFn> = {
  core: (hw, hh) => [0, 0.04 * hh, 0, fit(Math.min(0.9 * hw, 0.5 * hh)), 0, 0, 0, 0.8],
  nebula: (_hw, hh) => [0, 0, -0.6, fit(hh * 1.0), -1.0, 0, 0.3, 0.4],
  enigma: (hw, hh) => [0, 0.1 * hh, 0, fit(Math.min(0.85 * hw, 0.45 * hh)), 0, 0, 0, 0.42],
  route: (_hw, hh) => [0, 0, 0, fit(hh * 0.98), 0, 0, Math.PI / 2, 0.55],
  arena: (hw, hh) => [0, -0.62 * hh, 0.4, fit(hw * 1.9), 0.16, 0, 0, 0.5],
  screen: (hw, hh) => [0, 0.06 * hh, 0, fit(Math.min(0.98 * hw, 0.6 * hh)), 0, 0, 0, 0.5],
  trophy: (hw, hh) => [0, 0, 0, fit(Math.min(0.8 * hw, 0.5 * hh)), 0.05, 0, 0, 0.5],
  dust: (_hw, hh) => [0, 0, 0, fit(hh * 1.15), 0, 0, 0, 0.3],
};

// onde cada forma mora na tela, misturado com os mesmos pesos do morph
export class SceneLayout {
  private readonly poses: Float32Array;
  private readonly blend = new Float32Array(STRIDE);

  constructor(private readonly keys: readonly SceneKey[]) {
    this.poses = new Float32Array(keys.length * STRIDE);
  }

  // meia largura/altura visíveis no plano z = 0
  resize(halfWidth: number, halfHeight: number): void {
    const table = halfWidth < halfHeight ? TALL : WIDE;
    this.keys.forEach((key, i) => this.poses.set(table[key](halfWidth, halfHeight), i * STRIDE));
  }

  // aplica a pose misturada no objeto e devolve a opacidade
  apply(weights: Float32Array, target: Object3D): number {
    const b = this.blend;
    b.fill(0);
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i] ?? 0;
      if (w < 1e-4) continue;
      for (let j = 0; j < STRIDE; j++) b[j] = (b[j] ?? 0) + w * (this.poses[i * STRIDE + j] ?? 0);
    }
    target.position.set(b[0] ?? 0, b[1] ?? 0, b[2] ?? 0);
    target.scale.setScalar(b[3] ?? 1);
    target.rotation.set(b[4] ?? 0, b[5] ?? 0, b[6] ?? 0);
    return b[7] ?? 1;
  }
}
