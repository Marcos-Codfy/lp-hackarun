// perfil de torno da taça (raio, altura): plinto em dois degraus, pé, haste com nó, bojo e borda virada.
// shapes.glsl usa TROPHY_STAR_Y (estrela acima de 1.35 não gira) e o brilho especular do metal
const POINTS: readonly (readonly [number, number])[] = [
  [0.0, -1.62],
  [0.62, -1.62],
  [0.62, -1.47],
  [0.5, -1.47],
  [0.5, -1.37],
  [0.42, -1.35],
  [0.24, -1.26],
  [0.14, -1.14],
  [0.11, -1.0],
  [0.17, -0.93],
  [0.11, -0.86],
  [0.1, -0.7],
  [0.14, -0.62],
  [0.32, -0.55],
  [0.55, -0.38],
  [0.71, -0.12],
  [0.8, 0.2],
  [0.84, 0.52],
  [0.88, 0.78],
  [0.96, 0.9],
  [1.0, 0.94],
];

// alturas que viram aresta acesa (degraus do plinto, nó da haste, emenda haste/bojo, borda)
export const TROPHY_EDGES: readonly number[] = [1, 2, 3, 4, 9, 13, 19, 20];

export interface ProfilePoint {
  readonly r: number;
  readonly y: number;
}

export function trophyProfile(): ProfilePoint[] {
  return POINTS.map(([r, y]) => ({ r, y }));
}

// perfil denso pra anéis de latitude com passo uniforme no comprimento do perfil
export function sampleProfile(step: number): ProfilePoint[] {
  const out: ProfilePoint[] = [];
  for (let i = 1; i < POINTS.length; i++) {
    const [r0, y0] = POINTS[i - 1] ?? [0, 0];
    const [r1, y1] = POINTS[i] ?? [0, 0];
    const n = Math.max(1, Math.round(Math.hypot(r1 - r0, y1 - y0) / step));
    for (let k = i === 1 ? 0 : 1; k <= n; k++)
      out.push({ r: r0 + ((r1 - r0) * k) / n, y: y0 + ((y1 - y0) * k) / n });
  }
  return out;
}
