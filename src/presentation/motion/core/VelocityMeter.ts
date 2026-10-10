import { Observable } from '@shared/core/Observable';
import { Ticker } from '@shared/core/Ticker';
import { clamp, damp } from '@shared/utils/math';

// px/s que já conta como "rajada máxima"
const FULL_SPEED = 3400;

// velocidade do scroll 0..1: sobe rápido, volta pro zero devagar; só ocupa o ticker enquanto mexe
export class VelocityMeter {
  readonly value = new Observable(0);
  private raw = 0;
  private current = 0;
  private stopTicking: (() => void) | null = null;

  constructor(private readonly enabled: boolean) {}

  push(pxPerSecond: number): void {
    if (!this.enabled) return;
    // média móvel: o getVelocity do ScrollTrigger oscila muito entre um update e outro
    this.raw = this.raw * 0.7 + clamp(Math.abs(pxPerSecond) / FULL_SPEED) * 0.3;
    this.stopTicking ??= Ticker.shared.add(this.tick);
  }

  destroy(): void {
    this.stopTicking?.();
    this.stopTicking = null;
  }

  private readonly tick = (_time: number, delta: number): void => {
    const rising = this.raw > this.current;
    this.current = damp(this.current, this.raw, rising ? 3.5 : 2, delta);
    // o ScrollTrigger para de avisar quando o scroll para, então o alvo decai sozinho
    this.raw = damp(this.raw, 0, 2.5, delta);

    if (this.current < 0.002 && this.raw < 0.002) {
      this.current = 0;
      this.raw = 0;
      this.destroy();
    }
    this.value.set(Math.round(this.current * 1000) / 1000);
  };
}
