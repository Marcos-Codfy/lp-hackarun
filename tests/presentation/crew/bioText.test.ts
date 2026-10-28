// mini currículo dos convidados: link no formato [texto](https://...) vira <a>, o resto fica texto
import { describe, expect, it } from 'vitest';
import { bioParts } from '@presentation/sections/crew/bioText';

describe('bioParts', () => {
  it('separa texto e link mantendo a ordem', () => {
    expect(bioParts('aquisição pela [Magazine Luiza](https://exemplo.com/noticia).')).toEqual([
      { text: 'aquisição pela ' },
      { text: 'Magazine Luiza', href: 'https://exemplo.com/noticia' },
      { text: '.' },
    ]);
  });

  it('parágrafo sem link volta inteiro', () => {
    expect(bioParts('Engenheiro de software.')).toEqual([{ text: 'Engenheiro de software.' }]);
  });

  it('só aceita http(s): javascript: e link relativo ficam como texto', () => {
    expect(bioParts('[x](javascript:alert(1))')).toEqual([{ text: '[x](javascript:alert(1))' }]);
    expect(bioParts('[x](/pagina)')).toEqual([{ text: '[x](/pagina)' }]);
  });
});
