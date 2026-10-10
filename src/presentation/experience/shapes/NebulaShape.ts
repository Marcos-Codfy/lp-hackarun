import { SHAPE_RADIUS, type ShapeStrategy } from './ShapeStrategy';
import { PointWriter, TAU, gaussian, split, type Random } from './sampling';

const ARMS = 3;
const TWIST = 2.6;

// o globo "explode" numa galáxia em espiral: núcleo denso, 3 braços e um halo solto
export class NebulaShape implements ShapeStrategy {
  readonly key = 'nebula';

  generate(count: number, random: Random): Float32Array {
    const writer = new PointWriter(count);
    const [bulge = 0, halo = 0, arms = 0] = split(count, [0.12, 0.08, 0.8]);

    for (let i = 0; i < bulge; i++) {
      writer.push(gaussian(random) * 0.26, gaussian(random) * 0.12, gaussian(random) * 0.26);
    }
    for (let i = 0; i < halo; i++) {
      const angle = random() * TAU;
      const d = SHAPE_RADIUS * (0.3 + random() * 0.9);
      writer.push(Math.cos(angle) * d, gaussian(random) * 0.22, Math.sin(angle) * d);
    }
    for (let i = 0; i < arms; i++) {
      const d = Math.pow(random(), 0.7) * SHAPE_RADIUS;
      const falloff = d / SHAPE_RADIUS;
      const arm = Math.floor(random() * ARMS);
      const angle = (arm * TAU) / ARMS + d * TWIST + gaussian(random) * 0.2 * (0.4 + falloff);
      writer.push(
        Math.cos(angle) * d + gaussian(random) * 0.04,
        gaussian(random) * 0.09 * (1 - falloff * 0.7),
        Math.sin(angle) * d + gaussian(random) * 0.04,
      );
    }
    return writer.finish();
  }
}
