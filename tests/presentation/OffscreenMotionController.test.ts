// loops de CSS pausados nas seções longe da tela: a classe is-offscreen entra e sai conforme a seção se afasta
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OffscreenMotionController } from '@presentation/controllers/OffscreenMotionController';

let callback: IntersectionObserverCallback = () => undefined;
let options: IntersectionObserverInit | undefined;
let observed: Element[] = [];
let disconnect = vi.fn();

const see = (target: Element, isIntersecting: boolean) =>
  callback([{ target, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);

beforeEach(() => {
  observed = [];
  disconnect = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        callback = cb;
        options = init;
      }
      observe = (target: Element) => observed.push(target);
      disconnect = disconnect;
    },
  );
  document.body.innerHTML = `
    <header><section id="fora-do-main"></section></header>
    <main><section id="a"></section><section id="b"></section></main>
    <footer class="site-footer"></footer>`;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('OffscreenMotionController', () => {
  it('observa as seções do main e o rodapé, com uma tela de margem em cima e embaixo', () => {
    new OffscreenMotionController().mount();
    expect(observed.map((el) => el.id || el.className)).toEqual(['a', 'b', 'site-footer']);
    expect(options?.rootMargin).toBe('100% 0px');
  });

  it('seção que sai de perto ganha is-offscreen e perde quando volta', () => {
    new OffscreenMotionController().mount();
    const a = document.getElementById('a') as HTMLElement;
    see(a, false);
    expect(a.classList.contains('is-offscreen')).toBe(true);
    see(a, true);
    expect(a.classList.contains('is-offscreen')).toBe(false);
  });

  it('cada seção responde pelo próprio estado', () => {
    new OffscreenMotionController().mount();
    const [a, b] = [document.getElementById('a'), document.getElementById('b')] as HTMLElement[];
    see(a as HTMLElement, false);
    see(b as HTMLElement, true);
    expect([a?.classList.contains('is-offscreen'), b?.classList.contains('is-offscreen')]).toEqual([
      true,
      false,
    ]);
  });

  it('sem IntersectionObserver não faz nada (os loops seguem rodando, como antes)', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(() => new OffscreenMotionController().mount()).not.toThrow();
    expect(document.querySelector('.is-offscreen')).toBeNull();
  });

  it('destroy solta o observador', () => {
    const controller = new OffscreenMotionController();
    controller.mount();
    controller.destroy();
    expect(disconnect).toHaveBeenCalled();
  });
});
