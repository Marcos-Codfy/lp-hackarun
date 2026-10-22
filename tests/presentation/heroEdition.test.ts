// selo "1º" do herói: aria-label não vale num <p> sem papel (o Lighthouse reprova); o texto para leitor de tela vai
// num trecho sr-only e o numeral visual fica escondido da árvore de acessibilidade
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const markup = readFileSync(
  fileURLToPath(new URL('../../src/presentation/sections/hero/HeroEdition.astro', import.meta.url)),
  'utf8',
).split('<style>')[0] as string;

describe('selo da edição no herói', () => {
  it('não usa aria-label no parágrafo e lê "1ª edição" por um texto só para leitor de tela', () => {
    expect(markup).not.toMatch(/<p[^>]*aria-label/);
    expect(markup).toContain('<span class="sr-only">1ª edição</span>');
  });

  it('esconde o numeral visual da árvore de acessibilidade (não lê "1 o")', () => {
    expect(markup).toMatch(/hero__edition-num" aria-hidden="true"/);
  });
});
