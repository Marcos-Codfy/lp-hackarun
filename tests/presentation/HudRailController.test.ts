// pílula do HUD no celular: sai da frente do texto do rodapé enquanto ele está na tela
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HudRailController } from '@presentation/controllers/HudRailController';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class FakeObserver {
  static last: FakeObserver | null = null;
  static all: FakeObserver[] = [];
  readonly observed: Element[] = [];

  constructor(private readonly callback: Callback) {
    FakeObserver.last = this;
    FakeObserver.all.push(this);
  }

  static watching(selector: string): FakeObserver | undefined {
    return FakeObserver.all.find((o) => o.observed.some((el) => el.matches(selector)));
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

function mount(withFooter = true, withLobby = false) {
  document.body.innerHTML = `
    <div class="hud is-ready" data-hud><span data-hud-ticks></span></div>
    <main><section data-checkpoint="Largada"></section>
    ${withLobby ? '<div id="inscricao-lobby"></div>' : ''}</main>
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
  vi.useRealTimers();
  FakeObserver.last = null;
  FakeObserver.all = [];
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

describe('HudRailController · pílula fora da frente do texto', () => {
  it('marca .is-form enquanto o formulário de inscrição aparece', () => {
    const hud = mount(true, true);
    const lobby = FakeObserver.watching('#inscricao-lobby') as FakeObserver;
    lobby.show(true);
    expect(hud.classList.contains('is-form')).toBe(true);
    lobby.show(false);
    expect(hud.classList.contains('is-form')).toBe(false);
  });

  it('rolando pra baixo recolhe; subindo ou parado ~1,2 s, volta', () => {
    vi.useFakeTimers();
    // frame na hora (devolve 0: o controller anota o id depois do callback)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const hud = mount();
    const scrollTo = (y: number) => {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    };
    scrollTo(400);
    expect(hud.classList.contains('is-tucked')).toBe(true);
    scrollTo(300);
    expect(hud.classList.contains('is-tucked')).toBe(false);
    scrollTo(900);
    expect(hud.classList.contains('is-tucked')).toBe(true);
    vi.advanceTimersByTime(1300);
    expect(hud.classList.contains('is-tucked')).toBe(false);
  });
});
