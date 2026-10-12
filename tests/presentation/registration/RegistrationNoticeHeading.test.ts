// @vitest-environment node
// hierarquia de títulos em /inscricao (Lighthouse heading-order): o aviso "em breve"/"encerradas", o sucesso e
// o aviso montado no navegador vêm logo abaixo do h1 da página, então são h2; o visual segue o de h3
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../../src/presentation/${path}`, import.meta.url)), 'utf8');

const notice = read('components/registration/RegistrationNotice.astro');
const form = read('components/registration/RegistrationForm.astro');
const page = read('sections/RegistrationPageSection.astro');
const success = read('components/registration/RegistrationSuccess.astro');
const lobby = read('views/registration/ClosedLobby.ts');

describe('título do RegistrationNotice', () => {
  it('o nível é prop (h2 ou h3) e o padrão é h2', () => {
    expect(notice).toContain("level?: 'h2' | 'h3';");
    expect(notice).toContain("level = 'h2'");
    expect(notice).toMatch(/<Heading class="notice__title" tabindex="-1" data-reg-notice-title>/);
    expect(notice).not.toMatch(/<h[1-6][\s>]/);
  });

  it('em /inscricao fica um nível abaixo do h1 da página, sem pular pro h3', () => {
    expect(page).toMatch(/<SectionHeader[\s\S]*level="h1"/);
    expect(page).toContain('<RegistrationForm');
    const uses = form.match(/<RegistrationNotice\b[^>]*>/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) expect(use).not.toMatch(/level="h3"/);
  });

  it('o visual segue o de h3 em qualquer nível (peso, entrelinha e tracking fixos no componente)', () => {
    const rule = notice.match(/\.notice__title \{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('font-size: var(--fs-2xl)');
    expect(rule).toContain('font-weight: 700');
    expect(rule).toContain('line-height: var(--lh-snug)');
    expect(rule).toContain('letter-spacing: 0.04em');
  });

  it('o sucesso e o aviso montado pelo ClosedLobby também são h2 (a lateral com o outro h2 some no sucesso)', () => {
    expect(success).toMatch(/<h2 class="success__title" tabindex="-1" data-reg-success-title>/);
    expect(success).not.toMatch(/<h3[\s>]/);
    expect(lobby).toContain("createElement('h2')");
    expect(lobby).not.toContain("createElement('h3')");
    const rule = success.match(/\.success__title \{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('font-weight: 700');
    expect(rule).toContain('line-height: var(--lh-snug)');
    expect(rule).toContain('letter-spacing: 0.04em');
  });
});
