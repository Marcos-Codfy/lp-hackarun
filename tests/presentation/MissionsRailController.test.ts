// trilho de deslizar das missões no celular: contador, barra e foco só enquanto o trilho rola de fato
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MissionsRailController } from '@presentation/controllers/MissionsRailController';

let resize: (() => void) | null = null;

class FakeResizeObserver {
  constructor(callback: () => void) {
    resize = callback;
  }

  observe(): void {}
}

function render(cards = 8) {
  document.body.innerHTML = `
    <section data-missions>
      <ol data-missions-track>
        ${Array.from({ length: cards }, (_, i) => `<li data-station>Missão ${i + 1}</li>`).join('')}
      </ol>
      <b data-missions-current>01</b><span data-missions-bar></span>
    </section>`;
  const section = document.querySelector<HTMLElement>('[data-missions]') as HTMLElement;
  const track = section.querySelector<HTMLElement>('[data-missions-track]') as HTMLElement;
  // cards de 304px + 16px de vão num trilho de 360px
  track
    .querySelectorAll('[data-station]')
    .forEach((card, i) =>
      Object.defineProperty(card, 'offsetLeft', { value: 16 + i * 320, configurable: true }),
    );
  const size = (scrollWidth: number, clientWidth = 360) => {
    Object.defineProperty(track, 'scrollWidth', { value: scrollWidth, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: clientWidth, configurable: true });
  };
  const scroll = (left: number) => {
    track.scrollLeft = left;
    track.dispatchEvent(new Event('scroll'));
  };
  return { section, track, size, scroll };
}

const text = (selector: string) => document.querySelector(selector)?.textContent;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  // frame na hora (devolve 0: o controller anota o id depois do callback)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  resize = null;
});

describe('MissionsRailController', () => {
  it('trilho que rola: marca .is-rail, fica focável e o contador acompanha o scroll', () => {
    const { section, track, size, scroll } = render();
    size(2600);
    new MissionsRailController(section).mount();
    resize?.();
    expect(section.classList.contains('is-rail')).toBe(true);
    expect(track.tabIndex).toBe(0);
    scroll(960);
    expect(text('[data-missions-current]')).toBe('04');
    scroll(2240);
    expect(text('[data-missions-current]')).toBe('08');
    expect(document.querySelector<HTMLElement>('[data-missions-bar]')?.style.transform).toBe('scaleX(1.000)');
  });

  it('grade (640px+) ou trilho preso do desktop: nada de .is-rail nem tabindex', () => {
    const { section, track, size } = render();
    size(2600);
    new MissionsRailController(section).mount();
    resize?.();
    size(720, 720);
    resize?.();
    expect(section.classList.contains('is-rail')).toBe(false);
    expect(track.hasAttribute('tabindex')).toBe(false);
    section.classList.add('is-horizontal');
    size(2600);
    resize?.();
    expect(section.classList.contains('is-rail')).toBe(false);
  });

  it('um card só: não liga nada', () => {
    const { section } = render(1);
    new MissionsRailController(section).mount();
    expect(resize).toBeNull();
  });
});
