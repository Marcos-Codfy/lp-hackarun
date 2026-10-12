// divisão do título em linhas: estrutura gerada, acessibilidade e volta ao HTML original
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LineSplit } from '@presentation/motion/animators/heading/LineSplit';

// happy-dom não tem layout: o topo de cada palavra vem desta tabela (2ª linha a partir de "do")
const SECOND_LINE = new Set(['do', 'seu', 'lado?']);
const offsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

function title(html: string): HTMLElement {
  document.body.innerHTML = `<h2 id="t">${html}</h2>`;
  return document.getElementById('t') as HTMLElement;
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      return SECOND_LINE.has(this.textContent ?? '') ? 40 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 40 });
});

afterEach(() => {
  if (offsetTop) Object.defineProperty(HTMLElement.prototype, 'offsetTop', offsetTop);
  if (offsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
});

describe('LineSplit', () => {
  it('quebra nas linhas medidas e mantém o <em> com os atributos', () => {
    const el = title('Quem vai estar <em class="hl">do seu lado</em>?');
    const split = LineSplit.create(el, 'reveal-line');

    expect(split?.lines.map((line) => line.textContent)).toEqual(['Quem vai estar', 'do seu lado?']);
    const second = split?.lines[1];
    expect(second?.querySelector('em.hl')?.textContent).toBe('do seu lado');
    expect(second?.parentElement?.className).toBe('reveal-line-mask');
    expect(second?.parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Quem vai estar do seu lado?');
  });

  it('revert devolve os mesmos nós e tira o aria-label', () => {
    const el = title('Sua vaga na <em>corrida</em>.');
    const before = Array.from(el.childNodes);
    const html = el.innerHTML;

    LineSplit.create(el, 'reveal-line')?.revert();

    expect(el.innerHTML).toBe(html);
    expect(Array.from(el.childNodes)).toEqual(before);
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('não mexe em título com estrutura que não sabe dividir', () => {
    const el = title('Linha<br>quebrada');
    const html = el.innerHTML;

    expect(LineSplit.create(el, 'reveal-line')).toBeNull();
    expect(el.innerHTML).toBe(html);
  });

  it('mantém o aria-label que o título já tinha', () => {
    const el = title('A final é no <em>Capim Dourado Shopping</em>.');
    el.setAttribute('aria-label', 'A final é no Capim Dourado Shopping');

    LineSplit.create(el, 'reveal-line')?.revert();

    expect(el.getAttribute('aria-label')).toBe('A final é no Capim Dourado Shopping');
  });
});
