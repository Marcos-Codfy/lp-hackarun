import type { SceneKey } from '@presentation/app/AppEvents';
import type { ParticleBuffers } from '../particles/ParticleBuffers';
import { particleSeeds } from '../particles/particleSeeds';
import { ShapeFactory } from './ShapeFactory';

export type ParticleJob = Generator<void, ParticleBuffers>;

// cada passo pesado (gerar uma forma, ordenar uma forma, sementes) termina num yield:
// o worker roda direto até o fim, o fallback na thread principal devolve a vez entre os passos
export function* particleJob(keys: readonly SceneKey[], count: number): ParticleJob {
  const factory = ShapeFactory.createDefault();
  const targets: Float32Array[] = [];
  for (const key of keys) {
    const points = factory.generate(key, count);
    yield;
    targets.push(factory.order(points, count));
    yield;
  }
  return { targets, ...particleSeeds(count) };
}

export function runToEnd(job: ParticleJob): ParticleBuffers {
  for (;;) {
    const step = job.next();
    if (step.done) return step.value;
  }
}
