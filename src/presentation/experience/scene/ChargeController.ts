import type { EventBus } from '@shared/core/EventBus';
import type { Observable } from '@shared/core/Observable';
import type { AppEvents } from '@presentation/app/AppEvents';
import { damp, smoothstep } from '@shared/utils/math';

const PULSE_S = 1.2;
// distância (em seções) da cena de carga que conta como "saiu"
const AWAY = 0.85;

// carga do globo final: sobe em curva (acúmulo de energia), estoura num pulso e descarrega se o usuário sair
export class ChargeController {
  charge = 0;
  pulse = 0;
  private from = 0;
  private elapsed = 0;
  private duration = 0;
  private charging = false;
  private pulseAge = -1;
  private readonly off: () => void;

  constructor(
    bus: EventBus<AppEvents>,
    private readonly progress: Observable<number>,
    private readonly anchor: number,
    private readonly instant: boolean,
  ) {
    this.off = bus.on('experience:charging', ({ durationMs }) => this.begin(durationMs / 1000));
    // o 3D chegou com o usuário já parado no final (deep link): o evento passou, começa carregado
    if (anchor >= 0 && Math.abs(progress.value - anchor) < 0.25) this.charge = 1;
  }

  update(delta: number): void {
    const away = Math.abs(this.progress.value - this.anchor) > AWAY;
    if (away) {
      this.charging = false;
      this.charge = this.instant ? 0 : damp(this.charge, 0, 1.4, delta);
      if (this.charge < 0.001) this.charge = 0;
    } else if (this.charging) {
      this.elapsed += delta;
      const k = this.duration > 0 ? Math.min(1, this.elapsed / this.duration) : 1;
      this.charge = this.from + (1 - this.from) * k * k * k;
      if (k >= 1) this.complete();
    }
    this.updatePulse(delta);
  }

  dispose(): void {
    this.off();
  }

  private begin(durationS: number): void {
    this.from = this.charge;
    this.elapsed = 0;
    this.duration = durationS;
    this.charging = true;
    if (this.instant || durationS <= 0) this.complete();
  }

  private complete(): void {
    this.charging = false;
    this.charge = 1;
    if (!this.instant) this.pulseAge = 0;
  }

  // envelope do pulso: sobe rápido nos primeiros 12% e cai em curva
  private updatePulse(delta: number): void {
    if (this.pulseAge < 0) return;
    this.pulseAge += delta;
    const phase = this.pulseAge / PULSE_S;
    if (phase >= 1) {
      this.pulseAge = -1;
      this.pulse = 0;
      return;
    }
    this.pulse = smoothstep(0, 0.12, phase) * (1 - phase) * (1 - phase);
  }
}
