// nome de equipe longo no card estreito: quebra com hífen nas sílabas, nunca "DESENVOLVED / ORES"
import { describe, expect, it } from 'vitest';
import { softHyphenate, syllableBreaks } from '@presentation/formatters/SoftHyphens';

const SOFT = String.fromCharCode(0xad);

const shown = (text: string) => softHyphenate(text).replaceAll(SOFT, '-');

describe('softHyphenate (hífen opcional nas palavras longas)', () => {
  it.each([
    ['Os Desenvolvedores do Cerrado Tocantins', 'Os Desen-vol-ve-do-res do Cerrado Tocantins'],
    ['DESENVOLVEDORAS', 'DESEN-VOL-VE-DO-RAS'],
    ['Programadores', 'Pro-gra-ma-do-res'],
    ['Engenharia', 'Enge-nha-ria'],
    ['Cibersegurança', 'Ciber-se-gu-rança'],
    ['Quixeramobim', 'Qui-xe-ra-mo-bim'],
    ['Hackathonzeiros', 'Hac-ka-thon-zei-ros'],
  ])('%s -> %s', (name, expected) => {
    expect(shown(name)).toBe(expected);
  });

  it('palavra curta, número e pontuação ficam como estão', () => {
    expect(softHyphenate('Bug Busters 404')).toBe('Bug Busters 404');
    expect(softHyphenate('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });

  it('nunca deixa 1 ou 2 letras sozinhas na ponta da palavra ("DE-", "-SE")', () => {
    for (const word of shown('Desenvolvedores Inconstitucionalíssimo Abstraindo').split(' ')) {
      const parts = word.split('-');
      expect(parts.length).toBeGreaterThan(1);
      expect(parts[0]?.length).toBeGreaterThanOrEqual(3);
      expect(parts.at(-1)?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('o texto sem os hífens opcionais é o nome original', () => {
    const name = 'Guerreiros da Computação Tocantinense';
    expect(softHyphenate(name).replaceAll(SOFT, '')).toBe(name);
  });

  it('divisão silábica: dígrafo e encontro inseparável abrem a sílaba seguinte', () => {
    const split = (word: string) => {
      const at = syllableBreaks(word);
      return [0, ...at].map((from, i) => word.slice(from, at[i])).join('-');
    };
    expect(split('filho')).toBe('fi-lho');
    expect(split('empresa')).toBe('em-pre-sa');
    expect(split('carro')).toBe('car-ro');
    expect(split('transporte')).toBe('trans-por-te');
    expect(split('queijo')).toBe('quei-jo');
  });
});
