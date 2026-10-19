// cada assunto tem uma seção dona: o local da final nasce na seção 06 e nada que o visitante lê antes dela o
// entrega (senão a revelação perde a graça e a 06 vira repetição). A numeração também segue a ordem da página
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

// o que o visitante lê: sem comentários (//, {/* */}, /* */, <!-- -->) e sem o bloco <style>
function visibleText(source: string): string {
  return source
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// seções da LP na ordem em que são montadas (as comentadas no index não entram)
const ORDER = [...visibleText(read('pages/index.astro')).matchAll(/<(\w+Section) data=\{data\} \/>/g)].map(
  (match) => match[1] as string,
);

// código "NN" que aparece no título de cada seção (o regulamento, da Emilly, desenha o dele no próprio painel)
function codeOf(section: string): string | null {
  const own = visibleText(read(`presentation/sections/${section}.astro`)).match(/code="(\d+)"/);
  if (own) return own[1] as string;
  if (section !== 'RulebookSection') return null;
  const panel = visibleText(read('presentation/sections/missions/RulebookPanel.astro'));
  return panel.match(/rulebook__code[^>]*>\s*(\d+)/)?.[1] ?? null;
}

describe('ordem das seções', () => {
  it('a numeração do título segue a ordem em que as seções aparecem, sem buraco', () => {
    const codes = ORDER.map(codeOf).filter((code): code is string => code !== null);
    expect(codes).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
  });

  it('a grande final vem depois da programação e dos mentores, antes dos prêmios', () => {
    const at = (name: string) => ORDER.indexOf(name);
    expect(at('GrandFinalSection')).toBeGreaterThan(at('ScheduleSection'));
    expect(at('GrandFinalSection')).toBeGreaterThan(at('CrewSection'));
    expect(at('GrandFinalSection')).toBeLessThan(at('PrizesSection'));
  });
});

describe('o local da final pertence à seção 06', () => {
  it('a 06 mantém o título que revela o Capim Dourado', () => {
    const final = visibleText(read('presentation/sections/GrandFinalSection.astro'));
    expect(final).toContain('code="06"');
    expect(final).toContain('title="A final é no <em>Capim Dourado Shopping</em>."');
  });

  // o hero assina a edição com o shopping (marca e parceria, não o anúncio da final) e fica de fora
  const BEFORE_FINAL = ORDER.slice(1, ORDER.indexOf('GrandFinalSection'));
  const COPY_FILES = [
    ...BEFORE_FINAL.map((name) => `presentation/sections/${name}.astro`),
    'presentation/sections/about/AboutTicker.astro',
    'presentation/sections/npc/QuestLog.astro',
    'presentation/sections/missions/RulebookPanel.astro',
  ];

  it('as seções antes da 06 existem na lista (o teste não passa por estar vazio)', () => {
    expect(BEFORE_FINAL).toEqual([
      'AboutSection',
      'NpcSection',
      'RulebookSection',
      'ScheduleSection',
      'CrewSection',
    ]);
  });

  it.each(COPY_FILES)('%s não cita o Capim Dourado nem o shopping', (file) => {
    expect(visibleText(read(file))).not.toMatch(/capim|shopping/i);
  });

  it('o resumo de cada dia da programação não adianta o local da final', () => {
    const days = JSON.parse(read('infrastructure/content/event.json')).days as { summary: string }[];
    expect(days.length).toBeGreaterThan(0);
    for (const day of days) expect(day.summary).not.toMatch(/capim|shopping/i);
  });
});

describe('textos que não se repetem dentro da mesma seção', () => {
  it('o lead dos mentores não repete as regras que vêm logo abaixo', () => {
    const crew = visibleText(read('presentation/sections/CrewSection.astro'));
    const lead = crew.match(/lead="([^"]+)"/)?.[1] ?? '';
    expect(lead).not.toMatch(/disponibilidade|não poderão|documentação/i);
    expect(crew).toContain('O mentor orienta, mas não escreve a solução.');
    expect(crew).toContain('conforme a disponibilidade durante o evento');
  });

  it('o lead da programação orienta a leitura em vez de resumir os quatro dias das abas', () => {
    const schedule = visibleText(read('presentation/sections/ScheduleSection.astro'));
    const lead = schedule.match(/lead="([^"]+)"/)?.[1] ?? '';
    expect(lead).not.toMatch(/\d{2}\/11/);
  });

  it('o lead dos prêmios não repete o "palco da final" da seção anterior', () => {
    const prizes = visibleText(read('presentation/sections/PrizesSection.astro'));
    const lead = prizes.match(/lead="([^"]+)"/)?.[1] ?? '';
    expect(lead).not.toMatch(/palco|final/i);
  });
});
