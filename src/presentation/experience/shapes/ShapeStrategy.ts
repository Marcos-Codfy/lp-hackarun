import type { SceneKey } from '@presentation/app/AppEvents';

// todas as formas cabem mais ou menos nesse raio, centradas na origem; o layout escala depois
export const SHAPE_RADIUS = 1.6;

// Strategy: cada cena sabe gerar a própria nuvem de pontos (xyz em sequência)
export interface ShapeStrategy {
  readonly key: SceneKey;
  generate(count: number, random: () => number): Float32Array;
}
