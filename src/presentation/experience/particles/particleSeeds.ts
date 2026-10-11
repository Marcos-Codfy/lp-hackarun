import { seededRandom } from '@shared/utils/math';

const SEED = 20261111;

// aSeed (xyz em -1..1) e aScale por partícula: sorteio fixo, igual em toda visita
export function particleSeeds(count: number): { seeds: Float32Array; scales: Float32Array } {
  const random = seededRandom(SEED);
  const seeds = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = random() * 2 - 1;
    seeds[i * 3 + 1] = random() * 2 - 1;
    seeds[i * 3 + 2] = random() * 2 - 1;
    // maioria pequena, umas poucas grandes que viram "estrelas"
    scales[i] = 0.75 + Math.pow(random(), 6) * 1.25;
  }
  return { seeds, scales };
}
