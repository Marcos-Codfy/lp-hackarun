// rótulo das abas do cronograma no celular: "Desenvolvimento" não cabe na aba (66 a 92 px) e quebra em sílabas
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { softHyphenate } from '@presentation/formatters/SoftHyphens';

const SHY = '­';
const tabs = readFileSync(
  fileURLToPath(new URL('../../src/presentation/sections/schedule/DayTabs.astro', import.meta.url)),
  'utf8',
);

describe('rótulo das abas dos dias', () => {
  it('"Desenvolvimento" ganha pontos de quebra silábicos e as letras não mudam', () => {
    const label = softHyphenate('Desenvolvimento');
    const parts = label.split(SHY);
    expect(parts.length).toBeGreaterThanOrEqual(3);
    // nada de sobrar 1 ou 2 letras nas pontas ("DE-", "-TO")
    expect(parts[0]?.length).toBeGreaterThanOrEqual(3);
    expect(parts.at(-1)?.length).toBeGreaterThanOrEqual(3);
    expect(parts.join('')).toBe('Desenvolvimento');
  });

  it('os rótulos curtos não ganham hífen (Oficinas, Abertura, Final)', () => {
    for (const word of ['Oficinas', 'Abertura', 'Final']) expect(softHyphenate(word)).toBe(word);
  });

  it('a aba usa o hífen suave e limita o rótulo à largura da aba', () => {
    expect(tabs).toContain('softHyphenate(day.label)');
    expect(tabs).toMatch(/\.day-tab__label \{[^}]*max-width: 100%;[^}]*overflow-wrap: break-word;/s);
  });
});
