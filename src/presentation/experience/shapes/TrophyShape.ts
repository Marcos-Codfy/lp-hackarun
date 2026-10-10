import type { ShapeStrategy } from './ShapeStrategy';
import { PointWriter, TAU, gaussian, split, type Random } from './sampling';

// perfil de torno (raio, altura): base, pé, nó da haste, taça abrindo até a borda
const PROFILE: readonly (readonly [number, number])[] = [
  [0, -1.3],
  [0.62, -1.3],
  [0.62, -1.13],
  [0.48, -1.07],
  [0.36, -0.97],
  [0.16, -0.87],
  [0.12, -0.55],
  [0.2, -0.43],
  [0.12, -0.31],
  [0.12, -0.17],
  [0.22, -0.07],
  [0.5, 0.13],
  [0.72, 0.45],
  [0.82, 0.8],
  [0.86, 1.2],
  [0.9, 1.3],
];
const RIM = PROFILE[PROFILE.length - 1] ?? [0.9, 1.3];

// troféu: superfície de revolução amostrada por área + borda acesa + duas alças
export class TrophyShape implements ShapeStrategy {
  readonly key = 'trophy';

  generate(count: number, random: Random): Float32Array {
    const w = new PointWriter(count);
    const [surface = 0, rim = 0, handles = 0] = split(count, [0.8, 0.07, 0.13]);
    const weights = segmentWeights();
    const total = weights[weights.length - 1] ?? 1;

    for (let i = 0; i < surface; i++) {
      const s = pickSegment(weights, random() * total);
      const [r0, y0] = PROFILE[s] ?? RIM;
      const [r1, y1] = PROFILE[s + 1] ?? RIM;
      const t = random();
      const r = r0 + (r1 - r0) * t;
      const angle = random() * TAU;
      w.push(Math.cos(angle) * r, y0 + (y1 - y0) * t, Math.sin(angle) * r);
    }
    for (let i = 0; i < rim; i++) {
      const angle = random() * TAU;
      w.push(Math.cos(angle) * RIM[0], RIM[1] + gaussian(random) * 0.008, Math.sin(angle) * RIM[0]);
    }
    for (let i = 0; i < handles; i++) {
      // meia-volta pra fora, presa na parede da taça
      const side = i % 2 === 0 ? 1 : -1;
      const a = (random() - 0.5) * Math.PI;
      const tube = 0.04;
      w.push(
        side * (0.84 + Math.cos(a) * 0.4) + gaussian(random) * tube,
        0.7 + Math.sin(a) * 0.4 + gaussian(random) * tube,
        gaussian(random) * tube,
      );
    }
    return w.finish();
  }
}

// área de cada faixa ~ comprimento × raio médio (acumulada pra busca)
function segmentWeights(): Float32Array {
  const acc = new Float32Array(PROFILE.length - 1);
  let sum = 0;
  for (let i = 0; i < acc.length; i++) {
    const [r0, y0] = PROFILE[i] ?? RIM;
    const [r1, y1] = PROFILE[i + 1] ?? RIM;
    sum += Math.hypot(r1 - r0, y1 - y0) * ((r0 + r1) / 2 + 0.04);
    acc[i] = sum;
  }
  return acc;
}

function pickSegment(acc: Float32Array, value: number): number {
  for (let i = 0; i < acc.length; i++) if (value <= (acc[i] ?? 0)) return i;
  return acc.length - 1;
}
