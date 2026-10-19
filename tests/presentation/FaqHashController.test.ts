// /#faq-teams abre a pergunta do FAQ que o endereço aponta, na chegada e quando o hash muda
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FaqHashController } from '@presentation/controllers/FaqHashController';

const entry = (id: string) => document.getElementById(id) as HTMLDetailsElement;

beforeEach(() => {
  document.body.innerHTML = `
    <section id="faq">
      <details id="faq-teams"><summary>Como as equipes são formadas?</summary><p>Por sorteio.</p></details>
      <details id="faq-minors"><summary>Menor de 18?</summary><p>Autorização.</p></details>
    </section>
    <details id="outra"><summary>Fora do FAQ</summary></details>`;
  history.replaceState(null, '', '/');
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('FaqHashController', () => {
  it('na chegada com o hash de uma pergunta, abre só ela', () => {
    history.replaceState(null, '', '/#faq-teams');
    new FaqHashController().mount();
    expect(entry('faq-teams').open).toBe(true);
    expect(entry('faq-minors').open).toBe(false);
  });

  it('quando o hash muda, abre a pergunta nova e deixa a anterior como estava', () => {
    new FaqHashController().mount();
    expect(entry('faq-teams').open).toBe(false);
    history.replaceState(null, '', '/#faq-minors');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(entry('faq-minors').open).toBe(true);
    expect(entry('faq-teams').open).toBe(false);
  });

  it('hash da seção, de outro bloco ou de pergunta que não existe não abre nada', () => {
    new FaqHashController().mount();
    for (const hash of ['#faq', '#outra', '#faq-nao-existe', '#faq-%E0%A4%A']) {
      history.replaceState(null, '', `/${hash}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    expect(document.querySelectorAll('details[open]')).toHaveLength(0);
  });
});
