// ajustes de revisão visual: o seletor da inscrição sem trilho quadrado, o regulamento em destaque, o título
// do painel sem a expressão antiga, o botão do sorteio levando à pergunta aberta, as abas e o "Detalhes" com
// cara de clicável
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

describe('seletor da inscrição', () => {
  it('o trilho retangular só aparece com mais de uma aba (uma aba só virava um quadrado fantasma)', () => {
    const subnav = read('presentation/components/layout/SubNav.astro');
    expect(subnav).toMatch(/\.subnav__switch:has\(li \+ li\) \{[^}]*padding: 3px/);
    const base = subnav.slice(
      subnav.indexOf('.subnav__switch {'),
      subnav.indexOf('}', subnav.indexOf('.subnav__switch {')),
    );
    expect(base).not.toMatch(/background|box-shadow|padding/);
  });
});

describe('página de inscrição', () => {
  it('o regulamento tem um cartão de download logo abaixo do título', () => {
    const page = read('presentation/sections/RegistrationPageSection.astro');
    expect(page).toContain('<RegulationLink />');
    const link = read('presentation/components/registration/RegulationLink.astro');
    expect(link).toContain('download={REGULATION_PDF.fileName}');
    expect(link).toContain('Leia o regulamento antes de se inscrever');
  });

  it('o painel não usa mais "ter em mãos"', () => {
    for (const file of [
      'presentation/components/registration/PrepChecklist.astro',
      'presentation/sections/registration/RegistrationBriefToggle.astro',
    ]) {
      expect(read(file)).toContain('Antes de se inscrever');
      expect(read(file)).not.toMatch(/precisa ter em mãos|O que ter em mãos|Tenha em mãos/);
    }
  });
});

describe('botão "Como as equipes são formadas"', () => {
  it('leva à pergunta do FAQ, que o AnchorNavigator abre', () => {
    expect(read('presentation/sections/registration/ChargeCta.astro')).toContain('href="#faq-teams"');
    expect(read('presentation/sections/faq/FaqEntry.astro')).toContain('id={`faq-${item.id}`}');
    expect(read('presentation/motion/core/AnchorNavigator.ts')).toContain(
      'section instanceof HTMLDetailsElement',
    );
  });
});

describe('programação', () => {
  it('o rótulo comprido da aba ("Desenvolvimento") cabe na coluna estreita e nunca passa da borda inclinada', () => {
    const tabs = read('presentation/sections/schedule/DayTabs.astro');
    expect(tabs).toMatch(/\.day-tab__label \{[^}]*overflow-wrap: anywhere/);
    expect(tabs).toMatch(
      /@media \(min-width: 1024px\) and \(max-width: 1279px\) \{[\s\S]*letter-spacing: 0\.06em/,
    );
  });

  it('"Detalhes" tem contorno e fundo de botão', () => {
    const more = read('presentation/sections/schedule/ActivityMore.astro');
    expect(more).toMatch(/\.more__summary \{[^}]*border: 1px solid/);
    expect(more).toMatch(/\.more__summary \{[^}]*background:/);
  });
});
