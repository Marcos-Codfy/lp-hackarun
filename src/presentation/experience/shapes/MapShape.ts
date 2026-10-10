import { SHAPE_RADIUS, type ShapeStrategy } from './ShapeStrategy';
import { PolylinePath } from './PolylinePath';
import { PointWriter, TAU, gaussian, split, vec3, type Random, type Vec3 } from './sampling';

const STATIONS = 8;
const STRANDS = 3;
// perfil do raio da referência: entra à esquerda, afunda no meio e sobe forte no fim (t, y)
const PROFILE: readonly (readonly [number, number])[] = [
  [0, 0.12],
  [0.18, 0.18],
  [0.33, 0.02],
  [0.48, -0.34],
  [0.62, -0.18],
  [0.72, -0.14],
  [0.86, 0.2],
  [1, 0.3],
];

// a corrida: raio elétrico atravessando a tela, 8 estações brilhando e faíscas soltas
export class MapShape implements ShapeStrategy {
  readonly key = 'map';

  generate(count: number, random: Random): Float32Array {
    const writer = new PointWriter(count);
    const bolt = new PolylinePath(buildBolt(random));
    const [core = 0, strands = 0, nodes = 0, sparks = 0] = split(count, [0.44, 0.16, 0.28, 0.12]);
    const p = vec3();

    for (let i = 0; i < core; i++) {
      bolt.sample(random(), p);
      writer.push(p.x, p.y + gaussian(random) * 0.01, p.z + gaussian(random) * 0.01);
    }
    // filamentos finos que serpenteiam em volta do raio principal
    for (let i = 0; i < strands; i++) {
      const strand = i % STRANDS;
      const u = random();
      bolt.sample(u, p);
      const wave = Math.sin(u * TAU * (3 + strand * 2) + strand * 1.7) * (0.025 + strand * 0.018);
      writer.push(p.x, p.y + wave, p.z + wave * 0.6);
    }
    // estações: aglomerados densos em pontos igualmente espaçados do caminho
    for (let i = 0; i < nodes; i++) {
      bolt.sample(((i % STATIONS) + 0.5) / STATIONS, p);
      const r = 0.012 + Math.pow(random(), 2) * 0.07;
      const a = random() * TAU;
      const b = Math.acos(2 * random() - 1);
      writer.push(
        p.x + Math.sin(b) * Math.cos(a) * r,
        p.y + Math.cos(b) * r,
        p.z + Math.sin(b) * Math.sin(a) * r,
      );
    }
    for (let i = 0; i < sparks; i++) {
      bolt.sample(random(), p);
      const reach = 0.05 + Math.pow(random(), 2.5) * 0.45;
      writer.push(
        p.x + gaussian(random) * 0.05,
        p.y + (random() - 0.5) * reach * 2,
        p.z + (random() - 0.5) * reach,
      );
    }
    return writer.finish();
  }
}

// deslocamento de ponto médio: cada nível quebra os segmentos com metade da amplitude
function buildBolt(random: Random): Vec3[] {
  let points: Vec3[] = PROFILE.map(([t, y]) => ({ x: (t * 2 - 1) * SHAPE_RADIUS, y, z: 0 }));
  let amplitude = 0.16;
  for (let level = 0; level < 4; level++) {
    const next: Vec3[] = [];
    points.forEach((a, i) => {
      next.push(a);
      const b = points[i + 1];
      if (!b) return;
      next.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2 + (random() - 0.5) * amplitude,
        z: (a.z + b.z) / 2 + (random() - 0.5) * amplitude * 0.6,
      });
    });
    points = next;
    amplitude *= 0.55;
  }
  return points;
}
