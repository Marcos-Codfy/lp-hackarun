// onde o scroll do app para num alvo: abaixo do header fixo, a não ser que o alvo peça outra folga
// (o palco sticky do clímax para colado no topo: o miolo dele já desconta o header)
import { afterEach, describe, expect, it } from 'vitest';
import { targetY } from '@presentation/motion/core/ScrollDriver';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.style.removeProperty('scroll-padding-top');
});

function section(attrs = '') {
  document.body.innerHTML = `<section ${attrs}></section>`;
  const el = document.querySelector('section') as HTMLElement;
  el.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
  return el;
}

describe('targetY', () => {
  it('padrão: desconta a folga do header (scroll-padding-top do html)', () => {
    document.documentElement.style.setProperty('scroll-padding-top', '88px');
    expect(targetY(section(), 1000)).toBe(1412);
  });

  it('data-anchor-offset="0": para com o topo do alvo colado na tela', () => {
    document.documentElement.style.setProperty('scroll-padding-top', '88px');
    expect(targetY(section('data-anchor-offset="0"'), 1000)).toBe(1500);
  });

  it('offset de quem chama ganha de tudo; valor inválido cai no padrão', () => {
    document.documentElement.style.setProperty('scroll-padding-top', '88px');
    expect(targetY(section('data-anchor-offset="0"'), 1000, -20)).toBe(1480);
    expect(targetY(section('data-anchor-offset="abc"'), 1000)).toBe(1412);
  });
});
