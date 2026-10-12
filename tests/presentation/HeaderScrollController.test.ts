// header que recolhe rolando pra baixo: a pessoa rolando recolhe; o ajuste do navegador (seção adiada que monta
// e empurra o scroll ~24 px, sem roda, toque nem tecla) não recolhe o header que ela acabou de trazer de volta
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderScrollController } from '@presentation/controllers/HeaderScrollController';

let header: HTMLElement;
let controller: HeaderScrollController;

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
};
const wheel = () => window.dispatchEvent(new Event('wheel'));
const tucked = () => header.classList.contains('is-tucked');

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  header = document.createElement('header');
  document.body.append(header);
  controller = new HeaderScrollController(header);
  controller.mount();
  vi.runAllTimers();
});

afterEach(() => {
  controller.destroy();
  header.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('HeaderScrollController', () => {
  it('rolando pra baixo longe do topo recolhe; subindo, volta', () => {
    wheel();
    scrollTo(1200);
    expect(tucked()).toBe(true);
    expect(header.classList.contains('is-scrolled')).toBe(true);
    wheel();
    scrollTo(1100);
    expect(tucked()).toBe(false);
  });

  it('descida curta sem a pessoa mexer (scroll anchoring) não recolhe o header que ela trouxe de volta', () => {
    wheel();
    scrollTo(1200);
    scrollTo(1100);
    expect(tucked()).toBe(false);
    vi.advanceTimersByTime(500);
    scrollTo(1124);
    expect(tucked()).toBe(false);
  });

  it('a mesma descida curta logo depois da roda do mouse recolhe (é a pessoa rolando)', () => {
    scrollTo(1100);
    vi.advanceTimersByTime(500);
    wheel();
    scrollTo(1124);
    expect(tucked()).toBe(true);
  });

  it('descida longa recolhe mesmo sem evento de entrada (arrastar a barra de rolagem)', () => {
    scrollTo(1100);
    vi.advanceTimersByTime(500);
    scrollTo(1180);
    expect(tucked()).toBe(true);
  });
});
