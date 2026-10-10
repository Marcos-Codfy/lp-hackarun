import type { QualityProfile } from './QualityProfile';

const WINDOW_S = 0.5;
const LOW_FPS = 45;
const SUSTAIN_S = 2;
// ignora o começo (compilação de shader, upload) e o respiro logo depois de cada ajuste
const GRACE_S = 2;

export interface QualityTarget {
  setPixelRatioCap(cap: number): void;
  setProfile(profile: QualityProfile): void;
}

// monitor de FPS: abaixo de 45 por ~2s, baixa o DPR; no piso de DPR, baixa o tier. Nunca sobe.
export class AdaptiveQuality {
  private elapsed = 0;
  private frames = 0;
  private lowFor = 0;
  private grace = GRACE_S;
  private exhausted = false;
  private dpr: number;

  constructor(
    private profile: QualityProfile,
    private readonly target: QualityTarget,
    deviceDpr: number,
  ) {
    this.dpr = Math.min(deviceDpr, profile.maxDpr);
  }

  sample(delta: number): void {
    if (this.exhausted) return;
    if (this.grace > 0) {
      this.grace -= delta;
      return;
    }
    this.elapsed += delta;
    this.frames++;
    if (this.elapsed < WINDOW_S) return;

    const fps = this.frames / this.elapsed;
    this.elapsed = 0;
    this.frames = 0;
    this.lowFor = fps < LOW_FPS ? this.lowFor + WINDOW_S : 0;
    if (this.lowFor < SUSTAIN_S) return;

    this.lowFor = 0;
    this.grace = GRACE_S;
    this.degrade();
  }

  // aba voltou do background: o primeiro frame vem com delta enorme, não conta
  reset(): void {
    this.grace = Math.max(this.grace, 1);
    this.elapsed = 0;
    this.frames = 0;
    this.lowFor = 0;
  }

  private degrade(): void {
    if (this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.5);
      this.target.setPixelRatioCap(this.dpr);
      return;
    }
    const lower = this.profile.lower();
    if (!lower) {
      this.exhausted = true;
      return;
    }
    this.profile = lower;
    this.target.setProfile(lower);
  }
}
