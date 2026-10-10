import type { ShapeStrategy } from './ShapeStrategy';
import { PointWriter, gaussian, split, type Random } from './sampling';

// telão 16:9 (meia largura/altura) um pouco acima do centro, palco embaixo
const HALF_W = 1.35;
const HALF_H = HALF_W * (9 / 16);
const CENTER_Y = 0.32;
const FLOOR_Y = -1.05;
const GRID_X = 9;
const GRID_Y = 5;
const BEAMS: readonly (readonly [number, number])[] = [
  [-1.5, -0.7],
  [-0.75, -1.25],
  [0.75, 1.25],
  [1.5, 0.7],
];

// a final: telão gigante com grade fraca, borda do palco e feixes de luz
export class ScreenShape implements ShapeStrategy {
  readonly key = 'screen';

  generate(count: number, random: Random): Float32Array {
    const w = new PointWriter(count);
    const [frame = 0, grid = 0, fill = 0, stage = 0, beams = 0] = split(
      count,
      [0.34, 0.18, 0.08, 0.16, 0.24],
    );

    for (let i = 0; i < frame; i++) {
      // moldura dupla: borda externa forte e um filete interno
      const inset = random() < 0.7 ? 0 : 0.06;
      const [x, y] = onRectangle(random(), HALF_W - inset, HALF_H - inset);
      w.push(x + gaussian(random) * 0.006, CENTER_Y + y + gaussian(random) * 0.006, 0);
    }
    for (let i = 0; i < grid; i++) {
      const vertical = random() < 0.6;
      const line =
        (Math.floor(random() * (vertical ? GRID_X : GRID_Y)) + 1) / ((vertical ? GRID_X : GRID_Y) + 1);
      const along = random() * 2 - 1;
      const x = vertical ? (line * 2 - 1) * HALF_W : along * HALF_W;
      const y = vertical ? along * HALF_H : (line * 2 - 1) * HALF_H;
      w.push(x, CENTER_Y + y, -0.02);
    }
    for (let i = 0; i < fill; i++) {
      w.push((random() * 2 - 1) * HALF_W, CENTER_Y + (random() * 2 - 1) * HALF_H, -0.04);
    }
    for (let i = 0; i < stage; i++) {
      // borda da frente do palco (forte) e a de trás (mais curta)
      const front = random() < 0.65;
      const half = front ? 1.6 : 1.25;
      w.push((random() * 2 - 1) * half, FLOOR_Y + gaussian(random) * 0.008, front ? 0.45 : -0.3);
    }
    for (let i = 0; i < beams; i++) {
      const [from, to] = BEAMS[i % BEAMS.length] ?? [0, 0];
      // denso na base, abrindo e sumindo pra cima
      const h = Math.pow(random(), 1.7);
      const spread = 0.015 + h * 0.13;
      w.push(
        from + (to - from) * h + gaussian(random) * spread,
        FLOOR_Y + h * 2.5,
        -0.45 + gaussian(random) * spread,
      );
    }
    return w.finish();
  }
}

// ponto no perímetro de um retângulo centrado, u em 0..1
function onRectangle(u: number, hw: number, hh: number): [number, number] {
  const perimeter = 4 * (hw + hh);
  let d = u * perimeter;
  if (d < 2 * hw) return [-hw + d, hh];
  d -= 2 * hw;
  if (d < 2 * hh) return [hw, hh - d];
  d -= 2 * hh;
  if (d < 2 * hw) return [hw - d, -hh];
  d -= 2 * hw;
  return [-hw, -hh + d];
}
