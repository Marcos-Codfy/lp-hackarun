// os pesos da nota da banca que o painel do regulamento desenha em medidores
import { describe, expect, it } from 'vitest';
import { SCORING_WEIGHTS } from '@presentation/sections/missions/scoringWeights';

describe('pesos da pontuação', () => {
  it('são os do regulamento, na ordem em que o painel os mostra', () => {
    expect(SCORING_WEIGHTS.map(({ label, weight }) => [label, weight])).toEqual([
      ['Funcionalidade', 30],
      ['Qualidade técnica', 20],
      ['Inovação e IA', 20],
      ['Missões e evidências', 20],
      ['Pitch', 10],
    ]);
  });

  it('somam exatamente 100, a nota final inteira', () => {
    expect(SCORING_WEIGHTS.reduce((total, { weight }) => total + weight, 0)).toBe(100);
  });

  it('cada peso é múltiplo de 5: o medidor tem um bloco a cada 5% e nunca acende um bloco pela metade', () => {
    for (const { weight } of SCORING_WEIGHTS) expect(weight % 5).toBe(0);
  });
});
