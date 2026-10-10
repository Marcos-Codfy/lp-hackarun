import type { ShapeStrategy } from './ShapeStrategy';
import { crowd, platform } from './StageFloor';
import { beams, screen, truss } from './StageRig';
import type { Random } from './sampling';
import { paint } from './strokes';

// a final: telão de LED na treliça, canhões de luz abrindo pra cima, palco em arco e plateia na frente
export class StageShape implements ShapeStrategy {
  readonly key = 'stage';

  generate(count: number, random: Random): Float32Array {
    return paint([...screen(), ...truss(), ...beams(), ...platform(), ...crowd()], count, random);
  }
}
