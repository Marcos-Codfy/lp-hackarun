import type { Object3D } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { SHAPE_RADIUS } from '../shapes/ShapeStrategy';

// pose por cena: x, y, z, escala, rotX, rotY, rotZ, opacidade
type Pose = readonly [number, number, number, number, number, number, number, number];
type PoseFn = (hw: number, hh: number) => Pose;

const STRIDE = 8;
const fit = (radius: number): number => radius / SHAPE_RADIUS;
// 0 em 4:3, 1 a partir de 16:10: em 4:3 o título vira uma linha só e come a área livre do canto
const wideness = (hw: number, hh: number): number => Math.min(1, Math.max(0, (hw / hh - 1.34) / 0.26));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

// paisagem: forma ao lado do texto quando a seção tem conteúdo à esquerda
const WIDE: Record<SceneKey, PoseFn> = {
  core: (hw, hh) => [0, 0, 0, fit(Math.min(0.8 * hh, 0.62 * hw)), 0, 0, 0, 1],
  orbit: (hw, hh) => [0.5 * hw, 0.0, 0, fit(Math.min(0.56 * hh, 0.38 * hw)), 0.1, -0.42, 0, 0.95],
  enigma: (hw, hh) => [0.44 * hw, 0.02 * hh, 0, fit(Math.min(0.68 * hh, 0.38 * hw)), 0, -0.32, 0.05, 0.95],
  map: (hw, hh) => {
    const k = wideness(hw, hh);
    return [
      mix(0.58, 0.47, k) * hw,
      mix(0.02, 0.22, k) * hh,
      0,
      fit(Math.min(mix(0.36, 0.42, k) * hw, 0.6 * hh)),
      0,
      0,
      0,
      0.95,
    ];
  },
  // piso girado: o sol (bem ao fundo) vai pra direita e sai de trás do título "4 rounds"
  terrain: (hw, hh) => [0.3 * hw, -0.58 * hh, 0.2, 2.5, 0, -0.3, 0, 0.7],
  stage: (hw, hh) => [0.42 * hw, -0.1 * hh, 0, fit(Math.min(0.48 * hh, 0.28 * hw)), 0, -0.22, 0, 0.95],
  trophy: (hw, hh) => [0.5 * hw, 0.04 * hh, 0, fit(Math.min(0.62 * hh, 0.38 * hw)), 0.1, 0, 0, 0.95],
  dust: (hw, hh) => [0.45 * hw, 0.06 * hh, -1.5, fit(0.95 * hh), 1.05, 0, -0.4, 0.34],
};

// retrato: menor e mais apagado atrás do texto. O conteúdo ocupa a largura toda e os cards de vidro escondem
// o que fica atrás deles, então as formas sobem pra trás do título/parágrafo (a única área sem fundo)
const TALL: Record<SceneKey, PoseFn> = {
  core: (hw, hh) => [0, 0.04 * hh, 0, fit(Math.min(0.9 * hw, 0.5 * hh)), 0, 0, 0, 0.8],
  orbit: (hw, hh) => [0, -0.06 * hh, 0, fit(Math.min(0.9 * hw, 0.4 * hh)), 0.08, -0.2, 0, 0.55],
  enigma: (hw, hh) => [0.12 * hw, 0.26 * hh, 0, fit(Math.min(0.72 * hw, 0.38 * hh)), 0, -0.25, 0, 0.5],
  map: (hw, hh) => [0, 0.16 * hh, 0, fit(Math.min(0.8 * hw, 0.36 * hh)), 0, 0, 0, 0.45],
  terrain: (_hw, hh) => [0, -0.6 * hh, 0.4, 2.5, 0, 0, 0, 0.62],
  stage: (hw, hh) => [0, 0.2 * hh, 0, fit(Math.min(0.85 * hw, 0.4 * hh)), 0, -0.12, 0, 0.45],
  trophy: (hw, hh) => [0.1 * hw, 0.24 * hh, 0, fit(Math.min(0.62 * hw, 0.34 * hh)), 0.1, 0, 0, 0.55],
  dust: (_hw, hh) => [0, -0.04 * hh, -1.5, fit(0.9 * hh), 1.05, 0, -0.4, 0.3],
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
