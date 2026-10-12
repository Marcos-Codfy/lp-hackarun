import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { NavSpyController } from '@presentation/controllers/NavSpyController';

// header da LP: âncoras + "Equipes", que é página própria mas tem seção na LP (data-nav-spy)
const markup = `
  <header class="site-header">
    <a href="#sobre" data-nav-link>Sobre</a>
    <a href="/equipes" data-nav-link data-nav-spy="equipes">Equipes</a>
    <a href="#faq" data-nav-link>FAQ</a>
    <a href="/privacidade" data-nav-link>Privacidade</a>
  </header>
  <main>
    <section id="sobre" data-scene="a"></section>
    <section id="npcs" data-scene="b"></section>
    <section id="equipes" data-scene="c"></section>
    <section id="faq" data-scene="d"></section>
    <section id="inscricao" data-scene="e"></section>
  </main>`;

function setup() {
  document.body.innerHTML = markup;
  const bus = new EventBus<AppEvents>();
  new NavSpyController(bus).mount();
  const current = () =>
    Array.from(document.querySelectorAll('[aria-current]')).map((el) => el.textContent?.trim());
  const enter = (sectionId: string) => bus.emit('scene:enter', { sectionId } as AppEvents['scene:enter']);
  return { current, enter };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('NavSpyController', () => {
  it('na seção #equipes acende "Equipes", mesmo o link sendo /equipes', () => {
    const { current, enter } = setup();
    enter('equipes');
    expect(current()).toEqual(['Equipes']);
  });

  it('seção sem link herda o link anterior; depois do último link, nada acende', () => {
    const { current, enter } = setup();
    enter('npcs');
    expect(current()).toEqual(['Sobre']);
    enter('inscricao');
    expect(current()).toEqual([]);
  });

  it('link de página sem seção na LP nunca acende', () => {
    const { current, enter } = setup();
    for (const id of ['sobre', 'npcs', 'equipes', 'faq', 'inscricao']) {
      enter(id);
      expect(current()).not.toContain('Privacidade');
    }
  });
});
