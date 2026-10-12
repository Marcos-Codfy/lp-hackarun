// CTA do #inscricao: apagado até a carga, barra no tempo da segura e timers de segurança
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import { Observable } from '@shared/core/Observable';
import type { AppContext } from '@presentation/app/AppContext';
import type { AppEvents } from '@presentation/app/AppEvents';
import { ChargeRevealView } from '@presentation/views/ChargeRevealView';

function mount(reducedMotion = false) {
  document.body.innerHTML = '<section id="inscricao"></section>';
  const section = document.getElementById('inscricao') as HTMLElement;
  const bus = new EventBus<AppEvents>();
  const ctx: AppContext = {
    bus,
    config: { milestones: [], registration: {} as AppContext['config']['registration'], teamsEndpoint: null },
    reducedMotion,
    coarsePointer: false,
    motion: { scrollTo: vi.fn(), stop: vi.fn(), start: vi.fn() },
    scenes: { keys: [], progress: new Observable(0), velocity: new Observable(0) },
  };
  new ChargeRevealView(ctx, section).mount();
  return { bus, section };
}

beforeEach(() => {
  vi.useFakeTimers();
  // força o caminho sem IntersectionObserver (timer de 6 s): o teste fica só com os eventos
  vi.stubGlobal('IntersectionObserver', undefined);
  delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ChargeRevealView', () => {
  it('apaga o CTA, enche a barra no tempo da carga e acende no charged', () => {
    const { bus, section } = mount();
    expect(section.classList.contains('is-awaiting-charge')).toBe(true);
    bus.emit('experience:charging', { durationMs: 900 });
    expect(section.classList.contains('is-charging')).toBe(true);
    expect(section.style.getPropertyValue('--charge-ms')).toBe('900ms');
    bus.emit('experience:charged', undefined);
    expect(section.classList.contains('is-charged')).toBe(true);
    expect(section.classList.contains('is-awaiting-charge')).toBe(false);
    expect(section.classList.contains('is-charging')).toBe(false);
  });

  it('saiu no meio da carga: acende sozinho logo depois do tempo previsto', () => {
    const { bus, section } = mount();
    bus.emit('experience:charging', { durationMs: 900 });
    vi.advanceTimersByTime(3000);
    expect(section.classList.contains('is-charged')).toBe(false);
    vi.advanceTimersByTime(400);
    expect(section.classList.contains('is-charged')).toBe(true);
  });

  it('reduced motion: o CTA nunca fica apagado', () => {
    const { bus, section } = mount(true);
    expect(section.classList.contains('is-awaiting-charge')).toBe(false);
    bus.emit('experience:charging', { durationMs: 0 });
    bus.emit('experience:charged', undefined);
    expect(section.classList.contains('is-charged')).toBe(true);
  });
});
