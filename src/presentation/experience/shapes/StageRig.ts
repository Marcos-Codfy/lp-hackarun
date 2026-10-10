import { at } from './PointBrush';
import type { Vec3 } from './sampling';
import { blob, line, polyline, type Stroke } from './strokes';

// telão 16:9 com treliça e canhões de luz. Constantes espelhadas em shapes.glsl (STAGE_*)
export const SCREEN = { halfW: 1.3, halfH: 1.3 * (9 / 16), y: 0.4 };
export const PITCH = 0.052;
export const FLOOR = -0.56;
const TOP = SCREEN.y + SCREEN.halfH;
export const TRUSS = { low: TOP + 0.1, high: TOP + 0.19, halfW: 1.66 };
// canhões no topo da treliça: x da base e ângulo a partir da vertical (positivo abre pra direita)
export const BEAMS: readonly (readonly [number, number])[] = [
  [-1.62, -0.78],
  [-1.15, -0.42],
  [-0.68, -0.2],
  [-0.22, -0.06],
  [0.22, 0.06],
  [0.68, 0.2],
  [1.15, 0.42],
  [1.62, 0.78],
];
const BEAM_LENGTH = 1.7;

const rect = (hw: number, hh: number, cy: number, density: number): Stroke[] =>
  polyline([at(-hw, cy - hh), at(hw, cy - hh), at(hw, cy + hh), at(-hw, cy + hh), at(-hw, cy - hh)], density);

export function screen(): Stroke[] {
  const { halfW, halfH, y } = SCREEN;
  const cols = Math.round((halfW * 2) / PITCH);
  const rows = Math.round((halfH * 2) / PITCH);
  return [
    ...rect(halfW + 0.035, halfH + 0.035, y, 1700),
    ...rect(halfW + 0.008, halfH + 0.008, y, 700),
    // matriz de LED: cada pixel é um ponto cravado no centro da célula
    blob(9000, (b, n) => {
      for (let i = 0; i < n; i++) {
        const cell = (i * 7919) % (cols * rows);
        const cx = -halfW + PITCH * ((cell % cols) + 0.5);
        const cy = y - halfH + PITCH * (Math.floor(cell / cols) + 0.5);
        b.dot(cx, cy, 0, 0.0025);
      }
    }),
    // pernas do telão até o palco
    line(at(-0.95, FLOOR), at(-0.95, y - halfH - 0.035), 900),
    line(at(0.95, FLOOR), at(0.95, y - halfH - 0.035), 900),
  ];
}

// treliça: dois banzos com zigue-zague entre eles e as torres laterais
export function truss(): Stroke[] {
  const { low, high, halfW } = TRUSS;
  const strokes: Stroke[] = [
    line(at(-halfW, low), at(halfW, low), 1100),
    line(at(-halfW, high), at(halfW, high), 1100),
  ];
  const zig: Vec3[] = [];
  for (let x = -halfW, k = 0; x <= halfW + 1e-6; x += 0.09, k++) zig.push(at(x, k % 2 === 0 ? low : high));
  strokes.push(...polyline(zig, 380));
  [-halfW, halfW].forEach((x) => {
    const side = Math.sign(x) * 0.08;
    strokes.push(line(at(x, FLOOR), at(x, high), 900), line(at(x - side, FLOOR), at(x - side, low), 900));
    const tower: Vec3[] = [];
    for (let y = FLOOR, k = 0; y <= low + 1e-6; y += 0.09, k++) tower.push(at(k % 2 === 0 ? x : x - side, y));
    strokes.push(...polyline(tower, 300));
  });
  return strokes;
}

// feixe: cone de 3 fios (bordas + eixo) saindo do canhão; denso na boca e abrindo pra cima
export function beams(): Stroke[] {
  return BEAMS.flatMap(([x, angle]) => {
    const dir = { x: Math.sin(angle), y: Math.cos(angle) };
    const normal = { x: dir.y, y: -dir.x };
    const origin = at(x, TRUSS.high + 0.02);
    return [-1, 0, 1].map((lane) =>
      blob(lane === 0 ? 700 : 420, (b, n) => {
        for (let i = 0; i < n; i++) {
          const s = Math.pow((i + b.random()) / n, 1.35) * BEAM_LENGTH;
          const spread = lane * (0.01 + s * 0.05);
          b.dot(
            origin.x + dir.x * s + normal.x * spread,
            origin.y + dir.y * s + normal.y * spread,
            -0.05,
            0.003,
          );
        }
      }),
    );
  });
}
