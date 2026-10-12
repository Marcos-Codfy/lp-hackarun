// pílula do HUD no celular: sai da frente do texto do rodapé enquanto ele está na tela
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HudRailController } from '@presentation/controllers/HudRailController';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class FakeObserver {
  static last: FakeObserver | null = null;
  readonly observed: Element[] = [];

  constructor(private readonly callback: Callback) {
    FakeObserver.last = this;
  }

  observe(el: Element): void {
    this.observed.push(el);
  }

  disconnect(): void {
    this.observed.length = 0;
  }

  show(visible: boolean): void {
    this.callback([{ isIntersecting: visible }]);
  }
}

function mount(withFooter = true) {
  document.body.innerHTML = `
    <div class="hud is-ready" data-hud><span data-hud-ticks></span></div>
    <main><section data-checkpoint="Largada"></section></main>
    ${withFooter ? '<footer class="site-footer"></footer>' : ''}`;
  const hud = document.querySelector<HTMLElement>('[data-hud]') as HTMLElement;
  new HudRailController(hud).mount();
  return hud;
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  FakeObserver.last = null;
});

describe('HudRailController · rodapé', () => {
  it('marca .is-footer enquanto o rodapé aparece e tira quando ele sai', () => {
    const hud = mount();
    const observer = FakeObserver.last as FakeObserver;
    expect(observer.observed.map((el) => el.className)).toEqual(['site-footer']);
    observer.show(true);
    expect(hud.classList.contains('is-footer')).toBe(true);
    observer.show(false);
    expect(hud.classList.contains('is-footer')).toBe(false);
  });

  it('página sem rodapé não cria observer', () => {
    mount(false);
    expect(FakeObserver.last).toBeNull();
  });
});
