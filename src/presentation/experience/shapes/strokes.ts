import type { PolylinePath } from './PolylinePath';
import { PLANE_XY, PointBrush, type Plane } from './PointBrush';
import { TAU, type Random, type Vec3 } from './sampling';

// Composite: a forma é uma lista de traços; cada um pesa densidade × comprimento e recebe pontos na proporção.
// assim "aresta densa, preenchimento ralo" vira só um número por traço, em qualquer tier de partículas
export interface Stroke {
  readonly weight: number;
  draw(brush: PointBrush, n: number): void;
}

// traço cravado: sem desfoque (o bloom e o sprite já amaciam), e sai bem mais barato de gerar
const CRISP = 0;

const distance = (a: Vec3, b: Vec3): number => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

export const line = (a: Vec3, b: Vec3, density: number, blur = CRISP): Stroke => ({
  weight: density * distance(a, b),
  draw: (brush, n) => brush.segment(a, b, n, blur),
});

// vários segmentos com a mesma densidade (molduras, polígonos)
export const polyline = (points: readonly Vec3[], density: number, blur = CRISP): Stroke[] =>
  points.slice(1).map((b, i) => line(points[i] ?? b, b, density, blur));

export const arc = (
  center: Vec3,
  radius: number,
  density: number,
  options: { plane?: Plane; from?: number; to?: number; blur?: number } = {},
): Stroke => {
  const { plane = PLANE_XY, from = 0, to = TAU, blur = CRISP } = options;
  return {
    weight: density * radius * Math.abs(to - from),
    draw: (brush, n) => brush.arc(center, radius, plane, n, from, to, blur),
  };
};

export const trail = (path: PolylinePath, density: number, dz = 0, blur = CRISP): Stroke => ({
  weight: density * path.length,
  draw: (brush, n) => brush.path(path, n, blur, dz),
});

// peso direto (não depende de comprimento): núcleos, nuvens, multidões
export const blob = (weight: number, draw: (brush: PointBrush, n: number) => void): Stroke => ({
  weight,
  draw,
});

export function paint(strokes: readonly Stroke[], count: number, random: Random): Float32Array {
  const brush = new PointBrush(count, random);
  const total = strokes.reduce((sum, stroke) => sum + stroke.weight, 0) || 1;
  let used = 0;
  strokes.forEach((stroke, i) => {
    const last = i === strokes.length - 1;
    const n = last ? count - used : Math.round((count * stroke.weight) / total);
    used += n;
    if (n > 0) stroke.draw(brush, n);
  });
  return brush.finish();
}
