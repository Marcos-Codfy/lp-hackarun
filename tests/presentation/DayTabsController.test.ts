// abas da programação: padrão WAI-ARIA (role, aria-selected, tabindex móvel, setas, Home/End) e o estado sem JS
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DayTabsController, isoDateIn } from '@presentation/controllers/DayTabsController';

const DATES = ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'];

function render(): HTMLElement {
  const id = (date: string) => `dia-${date.slice(8)}`;
  document.body.innerHTML = `
    <div class="days" data-day-tabs>
      <div data-day-tablist hidden>
        ${DATES.map((d) => `<button type="button" id="${id(d)}-tab" data-day-tab="${id(d)}" data-date="${d}">${d}</button>`).join('')}
      </div>
      ${DATES.map((d) => `<section id="${id(d)}" data-day-panel><h3>${d}</h3><a href="#x">link</a></section>`).join('')}
    </div>`;
  return document.querySelector<HTMLElement>('[data-day-tabs]') as HTMLElement;
}

const tabs = () => [...document.querySelectorAll<HTMLButtonElement>('[data-day-tab]')];
const panels = () => [...document.querySelectorAll<HTMLElement>('[data-day-panel]')];
const visible = () =>
  panels()
    .filter((p) => !p.hidden)
    .map((p) => p.id);
const press = (key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
  }));
});

afterEach(() => {
  history.replaceState(null, '', location.pathname);
});

describe('DayTabsController', () => {
  it('sem montar, os dias ficam empilhados e o seletor escondido', () => {
    render();
    expect(visible()).toHaveLength(4);
    expect(document.querySelector('[data-day-tablist]')?.hasAttribute('hidden')).toBe(true);
  });

  it('liga o padrão de abas: tablist, tab, tabpanel e um painel por vez', () => {
    const root = render();
    new DayTabsController(root).mount();
    const list = document.querySelector('[data-day-tablist]');
    expect(list?.getAttribute('role')).toBe('tablist');
    expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(list?.hasAttribute('hidden')).toBe(false);
    expect(root.classList.contains('is-tabbed')).toBe(true);
    expect(tabs().map((t) => [t.getAttribute('role'), t.getAttribute('aria-controls')])).toEqual(
      DATES.map((d) => ['tab', `dia-${d.slice(8)}`]),
    );
    expect(
      panels().map((p) => [p.getAttribute('role'), p.getAttribute('aria-labelledby'), p.tabIndex]),
    ).toEqual(DATES.map((d) => ['tabpanel', `dia-${d.slice(8)}-tab`, 0]));
    expect(visible()).toEqual(['dia-11']);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('setas andam em roda, Home/End vão às pontas e o foco acompanha', () => {
    new DayTabsController(render()).mount();
    tabs()[0]?.focus();
    expect(press('ArrowRight').defaultPrevented).toBe(true);
    expect(visible()).toEqual(['dia-12']);
    expect(document.activeElement?.id).toBe('dia-12-tab');
    press('ArrowDown');
    expect(visible()).toEqual(['dia-13']);
    press('End');
    expect(visible()).toEqual(['dia-14']);
    press('ArrowRight');
    expect(visible()).toEqual(['dia-11']);
    press('ArrowLeft');
    expect(visible()).toEqual(['dia-14']);
    press('Home');
    expect(document.activeElement?.id).toBe('dia-11-tab');
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
  });

  it('outras teclas seguem o fluxo normal (Tab sai pro painel)', () => {
    new DayTabsController(render()).mount();
    tabs()[0]?.focus();
    expect(press('Tab').defaultPrevented).toBe(false);
    expect(press('a').defaultPrevented).toBe(false);
  });

  it('clique seleciona o dia', () => {
    new DayTabsController(render()).mount();
    tabs()[2]?.click();
    expect(visible()).toEqual(['dia-13']);
    expect(tabs()[2]?.tabIndex).toBe(0);
  });

  it('no dia do evento abre na aba de hoje', () => {
    new DayTabsController(render(), { today: '2026-11-13' }).mount();
    expect(visible()).toEqual(['dia-13']);
  });

  it('link pra um dia (/#dia-14) abre a aba dele, mesmo no dia do evento', () => {
    history.replaceState(null, '', '#dia-14');
    new DayTabsController(render(), { today: '2026-11-12' }).mount();
    expect(visible()).toEqual(['dia-14']);
    expect(document.querySelector('[aria-selected="true"]')?.id).toBe('dia-14-tab');
  });

  it('hash de outra seção não mexe na aba de hoje', () => {
    history.replaceState(null, '', '#faq');
    new DayTabsController(render(), { today: '2026-11-13' }).mount();
    expect(visible()).toEqual(['dia-13']);
  });

  it('hash trocado com a página aberta mostra o painel do dia e rola até ele', () => {
    new DayTabsController(render()).mount();
    const scroll = vi.fn();
    const target = panels()[2] as HTMLElement;
    target.scrollIntoView = scroll;
    history.replaceState(null, '', '#dia-13');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(visible()).toEqual(['dia-13']);
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
  });

  it('aba sem painel: não liga nada e mantém o empilhado', () => {
    const root = render();
    panels()[3]?.remove();
    new DayTabsController(root).mount();
    expect(root.classList.contains('is-tabbed')).toBe(false);
    expect(visible()).toHaveLength(3);
  });
});

describe('isoDateIn', () => {
  it('usa o fuso do evento, não o de quem abre a página', () => {
    // 01h UTC do dia 12 ainda é dia 11 em Palmas (-03:00)
    expect(isoDateIn('America/Araguaina', new Date('2026-11-12T01:00:00Z'))).toBe('2026-11-11');
    expect(isoDateIn('America/Araguaina', new Date('2026-11-12T03:00:00Z'))).toBe('2026-11-12');
  });
});
