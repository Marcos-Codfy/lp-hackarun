// altura da seção da programação na troca de dia: sem segurá-la, um dia mais curto encolhe a seção e a de baixo
// sobe pra dentro da tela (parecia que a página pulava pra seção 05 no primeiro clique no dia 13)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DayTabsController } from '@presentation/controllers/DayTabsController';

const DATES = ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'];

function render(): HTMLElement {
  const id = (date: string) => `dia-${date.slice(8)}`;
  document.body.innerHTML = `
    <div class="days" data-day-tabs>
      <div data-day-tablist hidden>
        ${DATES.map((d) => `<button type="button" id="${id(d)}-tab" data-day-tab="${id(d)}" data-date="${d}">${d}</button>`).join('')}
      </div>
      <div data-day-stage>
        ${DATES.map((d) => `<section id="${id(d)}" data-day-panel><h3>${d}</h3></section>`).join('')}
      </div>
    </div>`;
  return document.querySelector<HTMLElement>('[data-day-tabs]') as HTMLElement;
}

const tabs = () => [...document.querySelectorAll<HTMLButtonElement>('[data-day-tab]')];
const visible = () =>
  [...document.querySelectorAll<HTMLElement>('[data-day-panel]')].filter((p) => !p.hidden).map((p) => p.id);

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('altura da seção ao trocar de dia', () => {
  const stage = () => document.querySelector<HTMLElement>('[data-day-stage]') as HTMLElement;
  const measure = (height: number) => {
    stage().getBoundingClientRect = () => ({ height }) as DOMRect;
  };
  const held = () => stage().style.minHeight;
  // onde a seção está na tela (a <section>, ou o miolo quando não há uma); a janela de teste tem 768 px de altura
  const sectionAt = (top: number) => {
    const root = document.querySelector<HTMLElement>('[data-day-tabs]') as HTMLElement;
    const target = root.closest('section') ?? root;
    target.getBoundingClientRect = () => ({ top }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
  };

  it('trocar pra outro dia segura a altura que a seção tinha, então a de baixo não sobe', () => {
    new DayTabsController(render()).mount();
    measure(900);
    tabs()[2]?.click();
    expect(visible()).toEqual(['dia-13']);
    expect(held()).toBe('900px');
  });

  it('segura a maior altura vista: depois de um dia alto, um curto não encolhe a seção', () => {
    new DayTabsController(render()).mount();
    measure(900);
    tabs()[1]?.click();
    measure(1300);
    tabs()[3]?.click();
    expect(held()).toBe('1300px');
    measure(1300);
    tabs()[2]?.click();
    expect(held()).toBe('1300px');
  });

  it('abrir a página e clicar no dia que já está aberto não seguram nada', () => {
    new DayTabsController(render(), { today: '2026-11-13' }).mount();
    measure(900);
    expect(held()).toBe('');
    tabs()[2]?.click();
    expect(held()).toBe('');
  });

  it('solta a altura quando a seção fica toda abaixo da tela, onde ninguém vê a mudança', () => {
    new DayTabsController(render()).mount();
    measure(900);
    tabs()[2]?.click();
    sectionAt(200);
    expect(held()).toBe('900px');
    sectionAt(1400);
    expect(held()).toBe('');
  });

  it('solta mesmo quando a página salta de cima pra baixo sem passar pela seção (tecla Home)', () => {
    new DayTabsController(render()).mount();
    measure(900);
    tabs()[2]?.click();
    sectionAt(-2000);
    expect(held()).toBe('900px');
    sectionAt(5000);
    expect(held()).toBe('');
  });

  it('com a seção acima da tela mantém a altura: soltar empurraria o que a pessoa está lendo', () => {
    new DayTabsController(render()).mount();
    measure(900);
    tabs()[2]?.click();
    sectionAt(-2000);
    expect(held()).toBe('900px');
  });

  it('medir a <section> e não o miolo, que o navegador pula fora da tela', () => {
    const root = render();
    const section = document.createElement('section');
    root.replaceWith(section);
    section.append(root);
    new DayTabsController(root).mount();
    measure(900);
    tabs()[2]?.click();
    const spy = vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect);
    window.dispatchEvent(new Event('scroll'));
    expect(spy).toHaveBeenCalled();
    expect(held()).toBe('');
  });

  it('depois de solta, para de ouvir a rolagem', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    new DayTabsController(render()).mount();
    measure(900);
    tabs()[2]?.click();
    sectionAt(5000);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    remove.mockRestore();
  });

  it('mudar a largura da janela solta a altura; só a altura da janela (barra do navegador) não', () => {
    new DayTabsController(render()).mount();
    measure(900);
    tabs()[2]?.click();
    window.dispatchEvent(new Event('resize'));
    expect(held()).toBe('900px');
    vi.stubGlobal('innerWidth', window.innerWidth + 200);
    window.dispatchEvent(new Event('resize'));
    expect(held()).toBe('');
    vi.unstubAllGlobals();
  });

  it('sem o palco no HTML a troca de dia segue normal', () => {
    const root = render();
    stage().replaceWith(...Array.from(stage().children));
    new DayTabsController(root).mount();
    tabs()[2]?.click();
    expect(visible()).toEqual(['dia-13']);
  });
});
