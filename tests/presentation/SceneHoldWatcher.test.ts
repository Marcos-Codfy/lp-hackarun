// carga do globo final por tempo: segura curta, cancela se a pessoa sair e reduced motion pula direto pro fim
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { DEFAULT_HOLD_MS, SceneHoldWatcher, holdDuration } from '@presentation/motion/core/SceneHoldWatcher';

interface TriggerVars {
  onEnter: () => void;
  onLeave: () => void;
}

// vi.mock sobe pro topo do arquivo: o watcher já importa o ScrollTrigger falso
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@presentation/motion/core/gsap', () => ({ ScrollTrigger: { create: mocks.create } }));

function mount(hold: string, reducedMotion = false) {
  document.body.innerHTML = `<section data-scene-hold="${hold}"></section>`;
  const bus = new EventBus<AppEvents>();
  const charging = vi.fn();
  const charged = vi.fn();
  bus.on('experience:charging', charging);
  bus.on('experience:charged', charged);
  new SceneHoldWatcher(bus, reducedMotion);
  const trigger = mocks.create.mock.calls.at(-1)?.[0] as TriggerVars;
  return { trigger, charging, charged };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  mocks.create.mockReset();
});

describe('holdDuration', () => {
  it('lê o data-scene-hold e cai no padrão quando vem vazio ou inválido', () => {
    const el = document.createElement('section');
    el.dataset['sceneHold'] = '1200';
    expect(holdDuration(el)).toBe(1200);
    el.dataset['sceneHold'] = '0';
    expect(holdDuration(el)).toBe(DEFAULT_HOLD_MS);
    el.dataset['sceneHold'] = 'abc';
    expect(holdDuration(el)).toBe(DEFAULT_HOLD_MS);
  });

  it('a segura padrão fica abaixo de 1 s', () => {
    expect(DEFAULT_HOLD_MS).toBeGreaterThanOrEqual(800);
    expect(DEFAULT_HOLD_MS).toBeLessThanOrEqual(1000);
  });
});

describe('SceneHoldWatcher', () => {
  it('carrega pelo tempo da seção e só então emite o charged', () => {
    const { trigger, charging, charged } = mount('900');
    trigger.onEnter();
    expect(charging).toHaveBeenCalledWith({ durationMs: 900 });
    vi.advanceTimersByTime(899);
    expect(charged).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(charged).toHaveBeenCalledTimes(1);
  });

  it('saiu no meio da carga: não emite o charged', () => {
    const { trigger, charged } = mount('900');
    trigger.onEnter();
    vi.advanceTimersByTime(500);
    trigger.onLeave();
    vi.advanceTimersByTime(2000);
    expect(charged).not.toHaveBeenCalled();
  });

  it('reduced motion: carga zero e charged na hora', () => {
    const { trigger, charging, charged } = mount('900', true);
    trigger.onEnter();
    expect(charging).toHaveBeenCalledWith({ durationMs: 0 });
    expect(charged).toHaveBeenCalledTimes(1);
  });
});
