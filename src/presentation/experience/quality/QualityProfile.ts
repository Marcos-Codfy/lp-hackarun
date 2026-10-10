import type { QualityTier } from '@presentation/app/AppEvents';

// pós-processamento: bloom inteiro, bloom em meia resolução ou render direto (glow fake no sprite)
export type EffectsLevel = 'full' | 'half' | 'off';

const EFFECTS_ORDER: readonly EffectsLevel[] = ['off', 'half', 'full'];

// o mais barato dos dois (rebaixar tier nunca religa um efeito que o FPS já derrubou)
export function cheaperEffects(a: EffectsLevel, b: EffectsLevel): EffectsLevel {
  return EFFECTS_ORDER.indexOf(a) <= EFFECTS_ORDER.indexOf(b) ? a : b;
}

// um degrau abaixo; null quando já está no render direto
export function lowerEffects(level: EffectsLevel): EffectsLevel | null {
  const index = EFFECTS_ORDER.indexOf(level);
  return index > 0 ? (EFFECTS_ORDER[index - 1] ?? null) : null;
}

// Strategy de qualidade: partículas, DPR, pós e camadas de profundidade
export interface QualityProfile {
  readonly tier: QualityTier;
  readonly count: number;
  readonly maxDpr: number;
  // menos partículas = pontos um pouco maiores e mais opacos pra manter o volume de luz
  readonly pointScale: number;
  readonly alpha: number;
  readonly effects: EffectsLevel;
  readonly stars: number;
  readonly bokeh: number;
  lower(): QualityProfile | null;
}

export class LowQuality implements QualityProfile {
  readonly tier = 'low';
  readonly count = 9000;
  readonly maxDpr = 1;
  readonly pointScale = 1.5;
  readonly alpha = 0.95;
  readonly effects = 'off';
  readonly stars = 900;
  readonly bokeh = 12;

  lower(): QualityProfile | null {
    return null;
  }
}

export class MediumQuality implements QualityProfile {
  readonly tier = 'medium';
  readonly count = 22000;
  readonly maxDpr = 1.5;
  readonly pointScale = 1.2;
  readonly alpha = 0.85;
  readonly effects = 'half';
  readonly stars = 1800;
  readonly bokeh = 22;

  lower(): QualityProfile {
    return new LowQuality();
  }
}

export class HighQuality implements QualityProfile {
  readonly tier = 'high';
  readonly count = 42000;
  readonly maxDpr = 2;
  readonly pointScale = 1;
  readonly alpha = 0.75;
  readonly effects = 'full';
  readonly stars = 3200;
  readonly bokeh = 30;

  lower(): QualityProfile {
    return new MediumQuality();
  }
}

export function profileFor(tier: QualityTier): QualityProfile {
  if (tier === 'high') return new HighQuality();
  if (tier === 'medium') return new MediumQuality();
  return new LowQuality();
}
