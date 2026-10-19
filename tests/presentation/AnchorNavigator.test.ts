// links "#id" da própria página: rolam com o driver e, se o alvo é uma pergunta do FAQ (<details>), abrem a resposta
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnchorNavigator } from '@presentation/motion/core/AnchorNavigator';
import type { ScrollDriver } from '@presentation/motion/core/ScrollDriver';

function setup() {
  document.body.innerHTML = `
    <a id="go-section" href="#faq">FAQ</a>
    <a id="go-entry" href="#faq-teams">Como as equipes são formadas</a>
    <a id="go-missing" href="#nao-existe">Nada</a>
    <section id="faq"></section>
    <details id="faq-teams"><summary>Como as equipes são formadas?</summary><p>Por sorteio.</p></details>`;
  const driver = { scrollTo: vi.fn(), destroy: vi.fn() } as unknown as ScrollDriver;
  const navigator = new AnchorNavigator(driver);
  const click = (id: string, init: MouseEventInit = {}) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    document.getElementById(id)?.dispatchEvent(event);
    return event;
  };
  return { driver, navigator, click };
}

let current: AnchorNavigator | null = null;

beforeEach(() => {
  history.replaceState(null, '', '/');
});

afterEach(() => {
  current?.destroy();
  current = null;
  document.body.innerHTML = '';
});

describe('AnchorNavigator', () => {
  it('rola até a seção e atualiza o endereço sem pular', () => {
    const { driver, navigator, click } = setup();
    current = navigator;
    const event = click('go-section');
    expect(event.defaultPrevented).toBe(true);
    expect(driver.scrollTo).toHaveBeenCalledWith(document.getElementById('faq'), expect.any(Object));
    expect(location.hash).toBe('#faq');
  });

  it('pergunta do FAQ: abre a resposta antes de rolar', () => {
    const { driver, navigator, click } = setup();
    current = navigator;
    const entry = document.getElementById('faq-teams') as HTMLDetailsElement;
    expect(entry.open).toBe(false);
    click('go-entry');
    expect(entry.open).toBe(true);
    expect(driver.scrollTo).toHaveBeenCalledWith(entry, expect.any(Object));
  });

  it('alvo que não existe: deixa o navegador decidir', () => {
    const { driver, navigator, click } = setup();
    current = navigator;
    const event = click('go-missing');
    expect(event.defaultPrevented).toBe(false);
    expect(driver.scrollTo).not.toHaveBeenCalled();
  });

  it('clique com tecla modificadora ou botão do meio não é interceptado (e não abre nada)', () => {
    const { driver, navigator, click } = setup();
    current = navigator;
    expect(click('go-entry', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(click('go-entry', { button: 1 }).defaultPrevented).toBe(false);
    expect((document.getElementById('faq-teams') as HTMLDetailsElement).open).toBe(false);
    expect(driver.scrollTo).not.toHaveBeenCalled();
  });
});
