// luz do clímax com teto: o globo acende, mas o título, o contador e o CTA por cima continuam legíveis
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  MAX_CHARGE_BLOOM,
  MAX_CHARGE_EXPOSURE,
  PostDirector,
  type PostInput,
} from '@presentation/experience/post/PostDirector';
import { SCENE_LOOKS } from '@presentation/experience/post/SceneLooks';

function light(input: Partial<PostInput>) {
  const director = new PostDirector(['core']);
  const camera = new PerspectiveCamera();
  director.update(
    {
      weights: new Float32Array([1]),
      charge: 0,
      swell: 0,
      shockPhase: -1,
      afterglow: 0,
      warp: 0,
      velocity: 0,
      time: 0,
      pivot: new Vector3(),
      ...input,
    },
    camera,
  );
  return director.state;
}

describe('PostDirector', () => {
  it('sem carga fica com a luz da cena', () => {
    const state = light({});
    expect(state.bloomStrength).toBeCloseTo(SCENE_LOOKS.core.bloom);
    expect(state.exposure).toBeCloseTo(SCENE_LOOKS.core.exposure);
  });

  it('carga, pulso e brilho somados nunca passam do teto', () => {
    const state = light({ charge: 1, swell: 1, afterglow: 1 });
    expect(state.bloomStrength).toBeLessThanOrEqual(SCENE_LOOKS.core.bloom + MAX_CHARGE_BLOOM + 1e-6);
    expect(state.exposure).toBeLessThanOrEqual(SCENE_LOOKS.core.exposure * (1 + MAX_CHARGE_EXPOSURE) + 1e-6);
    expect(state.bloomStrength).toBeGreaterThan(SCENE_LOOKS.core.bloom);
  });

  it('assentado, o brilho calmo soma pouco', () => {
    const state = light({ afterglow: 1 });
    expect(state.bloomStrength - SCENE_LOOKS.core.bloom).toBeLessThanOrEqual(0.1 + 1e-6);
  });
});
