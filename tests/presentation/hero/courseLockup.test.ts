// @vitest-environment node
// selo de cursos do hero: ordem das linhas, leitura única pro leitor de tela e um logo só da UniCatólica na
// primeira tela
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COURSES, courseNames } from '@presentation/sections/hero/courseLockup';

const SECTIONS = fileURLToPath(new URL('../../../src/presentation/sections/', import.meta.url));
const read = (file: string) => readFileSync(join(SECTIONS, file), 'utf8');

describe('selo de cursos do hero', () => {
  it('Engenharia de Software vem antes (linha azul) e Inteligência Artificial depois (linha violeta)', () => {
    expect(COURSES.map(({ name, tone }) => [name, tone])).toEqual([
      ['Engenharia de Software', 'software'],
      ['Inteligência Artificial', 'ai'],
    ]);
  });

  it('junta os nomes dos cursos por extenso, como numa frase', () => {
    expect(courseNames()).toBe('Engenharia de Software e Inteligência Artificial');
    expect(courseNames([{ name: 'Engenharia de Software' }])).toBe('Engenharia de Software');
    expect(courseNames([])).toBe('');
  });

  it('o leitor de tela ouve o selo uma vez só: sem aria-label repetindo o que já está escrito', () => {
    const lockup = read('hero/HeroCourses.astro');
    expect(lockup).not.toMatch(/aria-label|role="group"/);
    // a relação instituição -> cursos fica na ordem de leitura, logo depois do alt do logo
    expect(lockup).toMatch(/alt=\{institution\}[\s\S]*?\/>\s*<span class="sr-only">, cursos:<\/span>/);
    expect(lockup).toContain('<ul class="hero-courses__list" role="list">');
  });

  it('o hero importa o logo da UniCatólica uma vez só (o selo; o rodapé do hero fica com o parceiro)', () => {
    const files = ['HeroSection.astro', ...readdirSync(join(SECTIONS, 'hero')).map((file) => `hero/${file}`)];
    const users = files.filter((file) => file.endsWith('.astro') && read(file).includes('unicatolica-white'));
    expect(users).toEqual(['hero/HeroCourses.astro']);
  });
});
