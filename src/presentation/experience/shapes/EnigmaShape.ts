import { SHAPE_RADIUS, type ShapeStrategy } from './ShapeStrategy';
import { rasterizeGlyph, type GlyphMask } from './GlyphMask';
import { PolylinePath } from './PolylinePath';
import { PointWriter, TAU, gaussian, pushCluster, split, vec3, type Random, type Vec3 } from './sampling';

const DEPTH = 0.32;

// "?" gigante: amostra o glifo de um canvas 2D e extruda; sem canvas, monta o "?" na mão
export class EnigmaShape implements ShapeStrategy {
  readonly key = 'enigma';

  generate(count: number, random: Random): Float32Array {
    const mask = rasterizeGlyph('?');
    return mask ? fromMask(mask, count, random) : procedural(count, random);
  }
}

function fromMask(mask: GlyphMask, count: number, random: Random): Float32Array {
  const writer = new PointWriter(count);
  const scale = (SHAPE_RADIUS * 2) / mask.height;
  const [walls = 0] = split(count, [0.42, 0.58]);

  for (let i = 0; i < count; i++) {
    // contorno vira a parede da extrusão; o resto cobre as faces da frente e de trás
    const isWall = i < walls;
    const pixels = isWall ? mask.edge : mask.fill;
    const p = Math.floor(random() * (pixels.length / 2)) * 2;
    const x = ((pixels[p] ?? 0) + random() - mask.centerX) * scale;
    const y = -((pixels[p + 1] ?? 0) + random() - mask.centerY) * scale;
    const z = isWall
      ? (random() - 0.5) * DEPTH
      : (random() < 0.5 ? -0.5 : 0.5) * DEPTH + gaussian(random) * 0.01;
    writer.push(x, y, z);
  }
  return writer.finish();
}

// gancho (arco), descida até a haste e o ponto
function procedural(count: number, random: Random): Float32Array {
  const writer = new PointWriter(count);
  const points: Vec3[] = [];
  for (let a = Math.PI * 1.1; a >= -Math.PI * 0.35; a -= 0.08) {
    points.push({ x: Math.cos(a) * 0.75, y: 0.75 + Math.sin(a) * 0.75, z: 0 });
  }
  points.push({ x: 0.05, y: -0.05, z: 0 }, { x: 0, y: -0.35, z: 0 }, { x: 0, y: -0.7, z: 0 });

  const path = new PolylinePath(points);
  const [stroke = 0, dot = 0] = split(count, [0.86, 0.14]);
  const p = vec3();
  for (let i = 0; i < stroke; i++) {
    path.sample(random(), p);
    const angle = random() * TAU;
    const r = Math.sqrt(random()) * 0.17;
    writer.push(
      p.x * 1.15 + Math.cos(angle) * r,
      p.y * 1.15 - 0.1 + Math.sin(angle) * r,
      (random() - 0.5) * DEPTH,
    );
  }
  pushCluster(writer, dot, { x: 0, y: -1.45, z: 0 }, 0.11, random);
  return writer.finish();
}
