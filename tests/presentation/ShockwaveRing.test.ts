// anel do clímax: nasce logo fora da silhueta do globo e abre devagar, sem chegar perto das bordas da tela
import { describe, expect, it } from 'vitest';
import { ringScale } from '@presentation/experience/layers/ShockwaveRing';

// a banda de luz fica em 0,9 do quad (shock.frag.glsl)
const BAND = 0.9;

describe('ringScale', () => {
  it('começa na borda do globo, por fora do título e do CTA', () => {
    const start = ringScale(0) * BAND;
    expect(start).toBeGreaterThanOrEqual(1);
    expect(start).toBeLessThan(1.1);
  });

  it('abre até no máximo ~1,6x o raio', () => {
    expect(ringScale(1) * BAND).toBeLessThanOrEqual(1.65);
  });

  it('cresce sempre e desacelera (sai rápido da borda, assenta devagar)', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map(ringScale);
    const gains = steps.slice(1).map((s, i) => s - (steps[i] ?? 0));
    gains.forEach((g) => expect(g).toBeGreaterThan(0));
    gains.slice(1).forEach((g, i) => expect(g).toBeLessThan(gains[i] ?? 0));
  });
});
