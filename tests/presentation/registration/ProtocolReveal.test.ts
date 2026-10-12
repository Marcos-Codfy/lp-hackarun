import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtocolReveal, revealFrame } from '@presentation/views/registration/ProtocolReveal';

afterEach(() => {
  vi.useRealTimers();
});

describe('revealFrame', () => {
  it('mostra n caracteres certos e um embaralhado na ponta', () => {
    expect(revealFrame('HR-26', 0, '#')).toBe('#');
    expect(revealFrame('HR-26', 2, '#')).toBe('HR#');
    expect(revealFrame('HR-26', 5, '#')).toBe('HR-26');
    expect(revealFrame('HR-26', 9, '#')).toBe('HR-26');
  });
});

describe('ProtocolReveal', () => {
  it('decodifica um caractere por passo e termina no protocolo certo', () => {
    vi.useFakeTimers();
    const el = document.createElement('span');
    new ProtocolReveal(el, false).play('HR26-AB');
    expect(el.textContent).toHaveLength(1);
    vi.advanceTimersByTime(60 * 3);
    expect(el.textContent?.startsWith('HR2')).toBe(true);
    vi.advanceTimersByTime(60 * 10);
    expect(el.textContent).toBe('HR26-AB');
  });

  it('em reduced motion escreve tudo de uma vez', () => {
    const el = document.createElement('span');
    new ProtocolReveal(el, true).play('HR26-AB');
    expect(el.textContent).toBe('HR26-AB');
  });
});
