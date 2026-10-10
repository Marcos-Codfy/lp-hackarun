import { SHAPE_RADIUS, type ShapeStrategy } from './ShapeStrategy';
import { PointWriter, type Random } from './sampling';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// globo de energia: casca em esfera de fibonacci; as ondas vêm do ruído no shader
export class CoreShape implements ShapeStrategy {
  readonly key = 'core';

  generate(count: number, random: Random): Float32Array {
    const writer = new PointWriter(count);
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const ring = Math.sqrt(1 - y * y);
      const theta = GOLDEN_ANGLE * i + (random() - 0.5) * 0.02;
      // 3 cascas coladas: o mesmo ruído desloca todas juntas e vira "fitas" paralelas na borda
      const layer = random();
      const shell = layer < 0.66 ? 1 : layer < 0.87 ? 0.955 : 1.035;
      const r = SHAPE_RADIUS * shell * (1 + (random() - 0.5) * 0.012);
      writer.push(Math.cos(theta) * ring * r, y * r, Math.sin(theta) * ring * r);
    }
    return writer.finish();
  }
}
