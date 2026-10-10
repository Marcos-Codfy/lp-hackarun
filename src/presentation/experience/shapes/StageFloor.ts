import { at } from './PointBrush';
import { FLOOR, TRUSS } from './StageRig';
import type { Vec3 } from './sampling';
import { blob, line, polyline, type Stroke } from './strokes';

// palco e plateia. A plateia fica em z > 0.75 (shapeStage faz ela pular no ritmo)
const EDGE_HALF = 1.85;
const SKIRT = 0.12;
const CROWD_ROWS_Z = [1.0, 1.4] as const;
const HEAD_GAP = 0.13;
const HEAD_Y = FLOOR - 0.13;

const frontZ = (x: number): number => 0.5 - 0.18 * (x / EDGE_HALF) ** 2;

// borda da frente em arco, saia com painéis, fundo sob o telão e uma fileira de ribaltas
export function platform(): Stroke[] {
  const top: Vec3[] = [];
  const bottom: Vec3[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = -EDGE_HALF + (2 * EDGE_HALF * i) / 40;
    top.push(at(x, FLOOR, frontZ(x)));
    bottom.push(at(x, FLOOR - SKIRT, frontZ(x)));
  }
  const back = TRUSS.halfW;
  const strokes: Stroke[] = [
    ...polyline(top, 1500),
    ...polyline(bottom, 600),
    line(at(-back, FLOOR, -0.12), at(back, FLOOR, -0.12), 700),
    line(at(-EDGE_HALF, FLOOR, frontZ(EDGE_HALF)), at(-back, FLOOR, -0.12), 700),
    line(at(EDGE_HALF, FLOOR, frontZ(EDGE_HALF)), at(back, FLOOR, -0.12), 700),
  ];
  for (let x = -EDGE_HALF; x <= EDGE_HALF + 1e-6; x += 0.37) {
    strokes.push(line(at(x, FLOOR, frontZ(x)), at(x, FLOOR - SKIRT, frontZ(x)), 600));
  }
  strokes.push(
    blob(700, (b, n) => {
      for (let i = 0; i < n; i++) {
        const x = -EDGE_HALF + 0.1 + (((i % 20) + 0.5) * (2 * EDGE_HALF - 0.2)) / 20;
        b.dot(x, FLOOR + 0.012, frontZ(x) + 0.01, 0.01);
      }
    }),
  );
  return strokes;
}

// plateia em silhueta: cada fileira é uma linha contínua passando por ombros e cabeças, com braços pra cima
export function crowd(): Stroke[] {
  return CROWD_ROWS_Z.flatMap((z, row) => crowdRow(z, row));
}

function crowdRow(z: number, row: number): Stroke[] {
  // pseudo-aleatório fixo por fileira: a silhueta não depende do tier de partículas
  let seed = 977 + row * 131;
  const rand = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const half = EDGE_HALF - 0.25 + row * 0.15;
  const skyline: Vec3[] = [];
  const strokes: Stroke[] = [];
  for (let x = -half; x <= half; x += HEAD_GAP + (rand() - 0.5) * 0.03) {
    const y = HEAD_Y - row * 0.09 + (rand() - 0.5) * 0.035;
    const r = 0.027 + rand() * 0.007;
    // ombro reto, pescoço curto e a cabeça redonda por cima (volta quase inteira)
    const shoulder = y - r * 2.9;
    skyline.push(
      at(x - 0.062, shoulder - 0.012, z),
      at(x - 0.04, shoulder, z),
      at(x - r * 0.45, shoulder + 0.01, z),
    );
    for (let k = 0; k <= 10; k++) {
      const a = -Math.PI / 2 - 0.5 - (k / 10) * (Math.PI * 2 - 1.0);
      skyline.push(at(x + Math.cos(a) * r, y + Math.sin(a) * r, z));
    }
    skyline.push(
      at(x + r * 0.45, shoulder + 0.01, z),
      at(x + 0.04, shoulder, z),
      at(x + 0.062, shoulder - 0.012, z),
    );
    if (rand() < 0.09) {
      const side = rand() < 0.5 ? -1 : 1;
      const hand = at(x + side * 0.07, y + 0.13, z);
      strokes.push(line(at(x + side * 0.04, y - 0.05, z), hand, 1100));
      // celular aceso na mão (stageHeat acende tudo acima das cabeças)
      strokes.push(blob(14, (b, n) => b.cluster(at(hand.x, hand.y + 0.012, z), 0.008, n)));
    }
  }
  return [...polyline(skyline, row === 0 ? 1000 : 750), ...strokes];
}
