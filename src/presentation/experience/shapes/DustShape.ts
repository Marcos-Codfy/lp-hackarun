import { SHAPE_RADIUS, type ShapeStrategy } from './ShapeStrategy';
import { PointWriter, type Random } from './sampling';

// poeira: espalhada e rasa no z pra não passar colada na câmera
export class DustShape implements ShapeStrategy {
  readonly key = 'dust';

  generate(count: number, random: Random): Float32Array {
    const writer = new PointWriter(count);
    for (let i = 0; i < count; i++) {
      writer.push((random() * 2 - 1) * SHAPE_RADIUS, (random() * 2 - 1) * SHAPE_RADIUS, -1.4 + random() * 2);
    }
    return writer.finish();
  }
}
