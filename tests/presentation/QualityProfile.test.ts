// o bloom nasce desligado em todos os tiers: o neon borrado da primeira abertura da aba (que só sumia quando o
// monitor de FPS cortava o pós) não pode voltar. O render direto é o visual nítido e já é o do tier baixo
import { describe, expect, it } from 'vitest';
import {
  cheaperEffects,
  HighQuality,
  LowQuality,
  lowerEffects,
  MediumQuality,
  profileFor,
} from '@presentation/experience/quality/QualityProfile';

describe('perfis de qualidade', () => {
  it.each([
    ['high', new HighQuality()],
    ['medium', new MediumQuality()],
    ['low', new LowQuality()],
  ] as const)('o tier %s desenha direto, sem bloom', (tier, profile) => {
    expect(profile.tier).toBe(tier);
    expect(profile.effects).toBe('off');
    expect(profileFor(tier).effects).toBe('off');
  });

  it('descer de tier nunca religa o bloom (a cadeia inteira fica em "off")', () => {
    for (
      let profile: ReturnType<typeof profileFor> | null = new HighQuality();
      profile;
      profile = profile.lower()
    ) {
      expect(profile.effects).toBe('off');
    }
  });

  it('o corte de efeitos não tem mais degrau abaixo do render direto', () => {
    expect(lowerEffects('off')).toBeNull();
    expect(lowerEffects('full')).toBe('half');
    expect(lowerEffects('half')).toBe('off');
  });

  it('o mais barato vence: um teto "off" derruba qualquer nível', () => {
    expect(cheaperEffects('full', 'off')).toBe('off');
    expect(cheaperEffects('off', 'full')).toBe('off');
    expect(cheaperEffects('half', 'full')).toBe('half');
  });

  it('as partículas dos tiers alto e médio seguem com a contagem e a opacidade de antes (só o pós saiu)', () => {
    expect([new HighQuality().count, new HighQuality().alpha]).toEqual([42000, 0.75]);
    expect([new MediumQuality().count, new MediumQuality().alpha]).toEqual([22000, 0.85]);
  });
});
