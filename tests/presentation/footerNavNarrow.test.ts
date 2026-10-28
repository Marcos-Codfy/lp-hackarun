// rodapé em 320 px: o menu de links vira uma coluna só (duas colunas faziam "Patrocinadores" passar da borda)
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const nav = readFileSync(
  fileURLToPath(new URL('../../src/presentation/components/layout/footer/FooterNav.astro', import.meta.url)),
  'utf8',
);

describe('menu do rodapé em tela muito estreita', () => {
  it('abaixo de 360 px os links ficam em uma coluna', () => {
    expect(nav).toMatch(
      /@media \(max-width: 359px\) \{\s*\.fnav__list \{\s*grid-template-columns: minmax\(0, 1fr\);/,
    );
  });
});
