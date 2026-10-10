import type { QualityTier } from '@presentation/app/AppEvents';

// Strategy de qualidade: quantas partículas, DPR máximo e como compensar menos pontos
export interface QualityProfile {
  readonly tier: QualityTier;
  readonly count: number;
  readonly maxDpr: number;
  // menos partículas = pontos um pouco maiores e mais opacos pra manter o volume de luz
  readonly pointScale: number;
  readonly alpha: number;
  lower(): QualityProfile | null;
}

export class LowQuality implements QualityProfile {
  readonly tier = 'low';
  readonly count = 9000;
  readonly maxDpr = 1;
  readonly pointScale = 1.55;
  readonly alpha = 0.9;

  lower(): QualityProfile | null {
    return null;
  }
}

export class MediumQuality implements QualityProfile {
  readonly tier = 'medium';
  readonly count = 22000;
  readonly maxDpr = 1.5;
  readonly pointScale = 1.2;
  readonly alpha = 0.82;

  lower(): QualityProfile {
    return new LowQuality();
  }
}

export class HighQuality implements QualityProfile {
  readonly tier = 'high';
  readonly count = 42000;
  readonly maxDpr = 2;
  readonly pointScale = 1;
  readonly alpha = 0.7;

  lower(): QualityProfile {
    return new MediumQuality();
  }
}

export function profileFor(tier: QualityTier): QualityProfile {
  if (tier === 'high') return new HighQuality();
  if (tier === 'medium') return new MediumQuality();
  return new LowQuality();
}
