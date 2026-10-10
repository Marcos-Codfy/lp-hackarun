import type { SceneKey } from '@presentation/app/AppEvents';
import { seededRandom } from '@shared/utils/math';
import type { ShapeStrategy } from './ShapeStrategy';
import { ArenaShape } from './ArenaShape';
import { CoreShape } from './CoreShape';
import { DustShape } from './DustShape';
import { EnigmaShape } from './EnigmaShape';
import { NebulaShape } from './NebulaShape';
import { RouteShape } from './RouteShape';
import { ScreenShape } from './ScreenShape';
import { TrophyShape } from './TrophyShape';
import { coherentOrder, sharedPermutation } from './sampling';

const PERMUTATION_SEED = 20261114;

// semente estável por cena: a mesma forma em toda visita
function seedOf(key: SceneKey): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return hash >>> 0;
}

// Factory + registry: cena → estratégia que gera a forma
export class ShapeFactory {
  private readonly registry = new Map<SceneKey, ShapeStrategy>();
  private permutation: Uint32Array | null = null;

  constructor(strategies: readonly ShapeStrategy[]) {
    strategies.forEach((strategy) => this.registry.set(strategy.key, strategy));
  }

  static createDefault(): ShapeFactory {
    return new ShapeFactory([
      new CoreShape(),
      new NebulaShape(),
      new EnigmaShape(),
      new RouteShape(),
      new ArenaShape(),
      new ScreenShape(),
      new TrophyShape(),
      new DustShape(),
    ]);
  }

  build(key: SceneKey, count: number): Float32Array {
    const strategy = this.registry.get(key) ?? this.registry.get('dust');
    if (!strategy) return new Float32Array(count * 3);
    const points = strategy.generate(count, seededRandom(seedOf(key)));
    return coherentOrder(points, this.permutationFor(count));
  }

  // todas as formas usam a mesma permutação: é ela que casa as partículas entre as cenas
  private permutationFor(count: number): Uint32Array {
    if (this.permutation?.length !== count) {
      this.permutation = sharedPermutation(count, seededRandom(PERMUTATION_SEED));
    }
    return this.permutation;
  }
}
