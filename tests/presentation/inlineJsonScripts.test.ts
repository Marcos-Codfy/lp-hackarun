// @vitest-environment node
// <script> de dados (config do app, JSON-LD) com set:html: o texto vai cru pro HTML, então tem que passar pelo
// safeJsonForScript. Um replace feito à mão já perdeu a barra uma vez e deixou "</script>" fechar a tag
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const DATA_SCRIPT = /<script\b[^>]*type="application\/(?:ld\+)?json"[^>]*set:html=\{(\w+)\}/g;

const astroFiles = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.astro'))
  .map((file) => ({ file, source: readFileSync(join(SRC, file), 'utf8') }));

const dataScripts = astroFiles.flatMap(({ file, source }) =>
  [...source.matchAll(DATA_SCRIPT)].map((match) => ({ file, source, name: match[1] ?? '' })),
);

describe('<script> de dados nas páginas', () => {
  it('acha os scripts de dados dos layouts e do SEO (a busca não ficou cega)', () => {
    const files = new Set(dataScripts.map(({ file }) => file.replaceAll('\\', '/')));
    expect([...files].sort()).toEqual(
      expect.arrayContaining([
        'presentation/components/seo/Seo.astro',
        'presentation/layouts/BaseLayout.astro',
        'presentation/layouts/PageLayout.astro',
      ]),
    );
  });

  it.each(dataScripts.map(({ file, source, name }) => [`${file} → ${name}`, source, name] as const))(
    '%s sai do safeJsonForScript, sem replace feito à mão',
    (_label, source, name) => {
      expect(source).toMatch(new RegExp(`const ${name} = [^;]*safeJsonForScript\\(`));
      expect(source).not.toMatch(/\.replace\(\/<\/g/);
    },
  );
});
