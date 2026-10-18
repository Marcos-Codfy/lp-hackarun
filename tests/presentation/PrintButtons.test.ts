// botão "Imprimir" de /autorizacao: escondido sem JS (vale o Ctrl+P), o JS mostra e liga no window.print
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrintButtons } from '@presentation/views/print/PrintButtons';

const button = (): HTMLButtonElement => {
  document.body.insertAdjacentHTML('beforeend', '<button type="button" data-print hidden>Imprimir</button>');
  return document.body.lastElementChild as HTMLButtonElement;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('PrintButtons', () => {
  it('mostra o botão e imprime a cada clique', () => {
    const el = button();
    const print = vi.fn();
    new PrintButtons([el], print).mount();
    expect(el.hidden).toBe(false);
    el.click();
    el.click();
    expect(print).toHaveBeenCalledTimes(2);
  });

  it('acha sozinho os [data-print] da página e usa o window.print por padrão', () => {
    const el = button();
    // o happy-dom não tem window.print: entra um dublê só neste teste
    const print = vi.fn();
    Object.defineProperty(window, 'print', { value: print, configurable: true, writable: true });
    new PrintButtons().mount();
    el.click();
    expect(print).toHaveBeenCalledOnce();
    Reflect.deleteProperty(window, 'print');
  });

  it('não liga botão sem data-print nem quebra numa página sem botão', () => {
    document.body.innerHTML = '<button type="button" hidden>Outro</button>';
    const other = document.querySelector('button') as HTMLButtonElement;
    const print = vi.fn();
    expect(() => new PrintButtons(undefined, print).mount()).not.toThrow();
    other.click();
    expect(other.hidden).toBe(true);
    expect(print).not.toHaveBeenCalled();
  });

  it('destroy desliga o clique', () => {
    const el = button();
    const print = vi.fn();
    const view = new PrintButtons([el], print);
    view.mount();
    view.destroy();
    el.click();
    expect(print).not.toHaveBeenCalled();
  });
});
