import { SHAPE_RADIUS, type ShapeStrategy } from './ShapeStrategy';
import { lerp } from '@shared/utils/math';
import { PointWriter, split, type Random } from './sampling';

const ROWS = 18;
const COLS = 26;
// mais fundo pra trás do que pra frente: a câmera fica perto da borda da frente
const Z_FAR = -1.5;
const Z_NEAR = 0.6;

// piso de terrain: grade de linhas pontilhadas (a onda vem do shader)
export class TerrainShape implements ShapeStrategy {
  readonly key = 'terrain';

  generate(count: number, random: Random): Float32Array {
    const writer = new PointWriter(count);
    const [rows = 0, cols = 0] = split(count, [0.56, 0.44]);
    const jitter = (): number => (random() - 0.5) * 0.008;

    for (let i = 0; i < rows; i++) {
      const z = lerp(Z_FAR, Z_NEAR, Math.floor(random() * ROWS) / (ROWS - 1));
      writer.push((random() * 2 - 1) * SHAPE_RADIUS, jitter(), z + jitter());
    }
    for (let i = 0; i < cols; i++) {
      const x = lerp(-SHAPE_RADIUS, SHAPE_RADIUS, Math.floor(random() * COLS) / (COLS - 1));
      writer.push(x + jitter(), jitter(), lerp(Z_FAR, Z_NEAR, random()));
    }
    return writer.finish();
  }
}
