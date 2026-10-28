// loops de CSS pausados enquanto a página rola: a classe is-scrolling entra no primeiro scroll e sai um instante depois do último
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollMotionController } from '@presentation/controllers/ScrollMotionController';

const scrolling = () => document.documentElement.classList.contains('is-scrolling');
const scroll = () => window.dispatchEvent(new Event('scroll'));

beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.className = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ScrollMotionController', () => {
  it('sem scroll, nada muda', () => {
    const controller = new ScrollMotionController();
    controller.mount();
    expect(scrolling()).toBe(false);
    controller.destroy();
  });

  it('o primeiro scroll liga a classe; ela só sai 160 ms depois do último', () => {
    const controller = new ScrollMotionController();
    controller.mount();
    scroll();
    expect(scrolling()).toBe(true);
    // scroll contínuo (um evento por quadro) segura a classe, sem desligar e ligar de novo
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(16);
      scroll();
      expect(scrolling()).toBe(true);
    }
    vi.advanceTimersByTime(159);
    expect(scrolling()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(scrolling()).toBe(false);
    controller.destroy();
  });

  it('só mexe na classe nas viradas, não a cada evento', () => {
    const controller = new ScrollMotionController();
    controller.mount();
    const toggles = vi.spyOn(document.documentElement.classList, 'add');
    for (let i = 0; i < 10; i++) scroll();
    expect(toggles).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it('um novo scroll depois de parar liga a classe de novo', () => {
    const controller = new ScrollMotionController();
    controller.mount();
    scroll();
    vi.advanceTimersByTime(200);
    expect(scrolling()).toBe(false);
    scroll();
    expect(scrolling()).toBe(true);
    controller.destroy();
  });

  it('destroy para de ouvir e solta a classe na hora', () => {
    const controller = new ScrollMotionController();
    controller.mount();
    scroll();
    controller.destroy();
    expect(scrolling()).toBe(false);
    scroll();
    expect(scrolling()).toBe(false);
    // e o timer pendente não religa nada
    vi.advanceTimersByTime(500);
    expect(scrolling()).toBe(false);
  });

  it('o ouvinte é passivo (não segura o scroll do celular)', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const controller = new ScrollMotionController();
    controller.mount();
    expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    controller.destroy();
  });
});
