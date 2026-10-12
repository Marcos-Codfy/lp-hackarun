import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { ScrollTrigger } from './gsap';

// segura curta: tempo de o globo juntar energia e o CTA acender, sem fazer ninguém esperar
export const DEFAULT_HOLD_MS = 900;

// data-scene-hold em ms; vazio, zero ou inválido cai no padrão
export function holdDuration(el: HTMLElement): number {
  const parsed = Number.parseInt(el.dataset['sceneHold'] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HOLD_MS;
}

// seções com data-scene-hold: carga do globo por TEMPO (nunca trava o scroll); funciona mesmo sem webgl
export class SceneHoldWatcher {
  private timer = 0;

  constructor(
    private readonly bus: EventBus<AppEvents>,
    private readonly reducedMotion: boolean,
  ) {
    document.querySelectorAll<HTMLElement>('[data-scene-hold]').forEach((el) => this.watch(el));
  }

  private watch(el: HTMLElement): void {
    const durationMs = holdDuration(el);
    const charge = (): void => this.charge(durationMs);
    const cancel = (): void => this.cancel();

    ScrollTrigger.create({
      trigger: el,
      // clamp: mesmo se a página não rolar até 35%, o gatilho ainda é alcançável
      start: 'clamp(top 35%)',
      end: 'bottom top',
      onEnter: charge,
      onEnterBack: charge,
      onLeave: cancel,
      onLeaveBack: cancel,
    });
  }

  private charge(durationMs: number): void {
    this.cancel();
    if (this.reducedMotion) {
      this.bus.emit('experience:charging', { durationMs: 0 });
      this.bus.emit('experience:charged', undefined);
      return;
    }
    this.bus.emit('experience:charging', { durationMs });
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      this.bus.emit('experience:charged', undefined);
    }, durationMs);
  }

  private cancel(): void {
    if (!this.timer) return;
    window.clearTimeout(this.timer);
    this.timer = 0;
  }
}
