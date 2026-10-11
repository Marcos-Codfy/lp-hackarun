// smoke: os botões [data-motion-toggle] e a classe do <html> seguem o VM; o sinal avisa quem monta depois
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';
import { MotionPreferenceView } from '@presentation/views/motion/MotionPreferenceView';
import { MOTION_PAUSED_CLASS, MotionPauseSignal } from '@presentation/views/motion/MotionPauseSignal';

const flushObservers = () => new Promise((resolve) => setTimeout(resolve, 0));

function mount(reducedMotion = false) {
  document.body.innerHTML = `
    <button data-motion-toggle aria-pressed="false" hidden>
      <span>Pausar animações</span><span data-motion-tip>Pausar animações</span>
    </button>
    <button data-motion-toggle aria-pressed="false" hidden><span>Pausar animações</span></button>`;
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]'));
  const vm = new MotionPreferenceViewModel({
    store: new MemoryPreferenceStore(),
    bus: new EventBus<AppEvents>(),
    reducedMotion,
  });
  new MotionPreferenceView(vm, buttons).mount();
  const [header, menu] = buttons as [HTMLButtonElement, HTMLButtonElement];
  return { vm, header, menu };
}

beforeEach(() => document.documentElement.classList.remove(MOTION_PAUSED_CLASS));
afterEach(() => document.documentElement.classList.remove(MOTION_PAUSED_CLASS));

describe('MotionPreferenceView', () => {
  it('mostra os botões e pausa os dois juntos, com a classe no <html>', () => {
    const { header, menu } = mount();
    expect(header.hidden).toBe(false);
    header.click();
    expect(header.getAttribute('aria-pressed')).toBe('true');
    expect(menu.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.classList.contains(MOTION_PAUSED_CLASS)).toBe(true);
    expect(header.querySelector('[data-motion-tip]')?.textContent).toBe('Retomar animações');
    menu.click();
    expect(header.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.classList.contains(MOTION_PAUSED_CLASS)).toBe(false);
  });

  it('Esc esconde o tooltip até o foco sair', () => {
    const { header } = mount();
    header.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(header.classList.contains('is-tip-dismissed')).toBe(true);
    header.dispatchEvent(new FocusEvent('blur'));
    expect(header.classList.contains('is-tip-dismissed')).toBe(false);
  });

  it('reduced motion: pressionado e indisponível', () => {
    const { header } = mount(true);
    expect(header.getAttribute('aria-pressed')).toBe('true');
    expect(header.getAttribute('aria-disabled')).toBe('true');
    header.click();
    expect(header.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('MotionPauseSignal', () => {
  it('avisa só quando o "pausado" muda, não a cada classe do <html>', async () => {
    const signal = new MotionPauseSignal();
    const onChange = vi.fn();
    const off = signal.watch(onChange);
    document.documentElement.classList.add('lenis-scrolling');
    await flushObservers();
    expect(onChange).not.toHaveBeenCalled();
    signal.set(true);
    await flushObservers();
    expect(onChange).toHaveBeenCalledWith(true);
    off();
    signal.set(false);
    await flushObservers();
    expect(onChange).toHaveBeenCalledTimes(1);
    document.documentElement.classList.remove('lenis-scrolling');
  });
});
