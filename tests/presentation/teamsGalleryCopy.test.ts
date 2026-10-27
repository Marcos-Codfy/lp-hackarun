// /equipes (escondida até o sorteio): a inscrição agora é individual, então o botão não fala mais em "minha equipe"
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const gallery = readFileSync(
  fileURLToPath(new URL('../../src/presentation/components/teams/TeamGallery.astro', import.meta.url)),
  'utf8',
);

describe('galeria de equipes vazia', () => {
  it('o botão leva a uma inscrição individual, sem "inscrever minha equipe"', () => {
    expect(gallery).not.toMatch(/Inscrever minha equipe/i);
    expect(gallery).toContain('Fazer minha inscrição');
  });
});
