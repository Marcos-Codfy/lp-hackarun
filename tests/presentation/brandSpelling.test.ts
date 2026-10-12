// @vitest-environment node
// a instituição se escreve "UniCatólica" (a faixa em caixa alta "UNICATÓLICA" é outra grafia e vale).
// O teste do conteúdo só olha os JSON: este passa pelas páginas, componentes, SEO e metadados do projeto
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TEXT = /\.(astro|ts|css|json)$/;
const WRONG = /Unicatólica/;

const filesIn = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => TEXT.test(file))
    .map((file) => join(dir, file));

const sources = [...filesIn('src'), ...filesIn('scripts/docs'), 'package.json'].map((file) => ({
  file: file.replaceAll('\\', '/'),
  text: readFileSync(join(ROOT, file), 'utf8'),
}));

describe('grafia da instituição', () => {
  it('a busca enxerga as páginas, o rodapé, o menu e o SEO', () => {
    const files = sources.map(({ file }) => file);
    expect(files).toEqual(
      expect.arrayContaining([
        'src/presentation/components/layout/SiteFooter.astro',
        'src/presentation/components/layout/header/MobileMenu.astro',
        'src/presentation/components/seo/teamsPageSeo.ts',
        'scripts/docs/pdf/PdfWriter.ts',
        'package.json',
      ]),
    );
  });

  it('nenhum arquivo escreve "Unicatólica"', () => {
    const wrong = sources.filter(({ text }) => WRONG.test(text)).map(({ file }) => file);
    expect(wrong).toEqual([]);
  });
});
