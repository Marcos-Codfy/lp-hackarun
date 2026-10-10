import type { EventBus } from '@shared/core/EventBus';
import type { Observable } from '@shared/core/Observable';
import type { AppEvents } from '@presentation/app/AppEvents';
import { damp, smoothstep } from '@shared/utils/math';

const PULSE_S = 1.2;
const SHOCK_S = 1.8;
const FLASH_ATTACK_S = 0.05;
const FLASH_DECAY = 4.2;
const BURST_S = 2;
// distância (em seções) da cena de carga que conta como "saiu"
const AWAY = 0.85;

type ChargeState = 'idle' | 'charging' | 'charged';

// clímax do globo final: acumula energia em curva, estoura (flash + pulso + anel) no 'experience:charged'
// e assenta num brilho calmo; descarrega se o usuário sair
export class ChargeController {
  // agitação/contração/calor da carga
  charge = 0;
  // empurrão radial das partículas no estouro
  pulse = 0;
  flash = 0;
  // fase do anel de choque (< 0 = sem anel)
  shock = -1;
  // brilho calmo depois do estouro
  afterglow = 0;
  private state: ChargeState = 'idle';
  private from = 0;
  private elapsed = 0;
  private duration = 0;
  private burstAge = -1;
  private readonly offs: (() => void)[] = [];

  constructor(
    bus: EventBus<AppEvents>,
    private readonly progress: Observable<number>,
    private readonly anchor: number,
    private readonly instant: boolean,
  ) {
    this.offs.push(bus.on('experience:charging', ({ durationMs }) => this.begin(durationMs / 1000)));
    // o flash sai no mesmo evento do som: sincronia exata
    this.offs.push(bus.on('experience:charged', () => this.complete()));
    // o 3D chegou com o usuário já parado no final (deep link): o evento passou, começa assentado
    if (anchor >= 0 && Math.abs(progress.value - anchor) < 0.25) {
      this.state = 'charged';
      this.afterglow = 1;
    }
  }

  update(delta: number): void {
    const away = Math.abs(this.progress.value - this.anchor) > AWAY;
    if (away) {
      this.state = 'idle';
      this.charge = this.settle(this.charge, 0, 1.4, delta);
      this.afterglow = this.settle(this.afterglow, 0, 1.4, delta);
    } else if (this.state === 'charging') {
      this.elapsed += delta;
      const k = this.duration > 0 ? Math.min(1, this.elapsed / this.duration) : 1;
      // segura no topo até o evento chegar (o timer do SceneHoldWatcher manda)
      this.charge = this.from + (1 - this.from) * k * k * k;
    } else if (this.state === 'charged') {
      this.charge = this.settle(this.charge, 0, 1.6, delta);
      this.afterglow = this.settle(this.afterglow, 1, 2.5, delta);
    }
    this.updateBurst(delta);
  }

  dispose(): void {
    this.offs.forEach((off) => off());
  }

  private begin(durationS: number): void {
    this.from = this.charge;
    this.elapsed = 0;
    this.duration = durationS;
    this.state = 'charging';
  }

  private complete(): void {
    if (this.state !== 'charging') return;
    this.state = 'charged';
    if (this.instant) {
      this.charge = 0;
      this.afterglow = 1;
      return;
    }
    this.charge = 1;
    this.burstAge = 0;
  }

  private settle(value: number, target: number, lambda: number, delta: number): number {
    if (this.instant) return target;
    const next = damp(value, target, lambda, delta);
    return Math.abs(next - target) < 0.001 ? target : next;
  }

  // envelopes do estouro: flash com ataque curto, pulso em curva e anel abrindo
  private updateBurst(delta: number): void {
    if (this.burstAge < 0) return;
    this.burstAge += delta;
    const age = this.burstAge;
    if (age >= BURST_S) {
      this.burstAge = -1;
      this.pulse = 0;
      this.flash = 0;
      this.shock = -1;
      return;
    }
    this.flash =
      age < FLASH_ATTACK_S ? age / FLASH_ATTACK_S : Math.exp(-(age - FLASH_ATTACK_S) * FLASH_DECAY);
    const phase = Math.min(1, age / PULSE_S);
    this.pulse = smoothstep(0, 0.12, phase) * (1 - phase) * (1 - phase);
    this.shock = age < SHOCK_S ? age / SHOCK_S : -1;
  }
}
