// aviso de privacidade (LGPD): quem é o controlador dos dados
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

describe('aviso de privacidade: controlador', () => {
  const notice = read('src/presentation/components/privacy/PrivacyNotice.astro').replace(/\s+/g, ' ');

  it('o controlador é a LAES, por extenso, e não a UniCatólica', () => {
    expect(notice).toContain(
      '<strong>controlador</strong> é a Liga Acadêmica de Engenharia de Software e Inteligência Artificial (LAES)',
    );
    expect(notice).not.toMatch(/controlador<\/strong> é o Centro Universitário/);
  });
});
