// @vitest-environment node
// faixa "Quem faz acontecer": papel e tom de cada parceiro, logo pra todos do partners.json e o tamanho ótico
// calculado só pelo desenho (sem a borda transparente do PNG)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import partnersData from '@infrastructure/content/partners.json';
import type { RawPartner } from '@infrastructure/content/schema';
import { PARTNER_BRANDS } from '@presentation/components/partners/partnerBrands';
import {
  PARTNER_ROLES,
  markVars,
  markWidthRem,
  partnerCopy,
} from '@presentation/components/partners/partnerMarks';

const PARTNERS = partnersData as RawPartner[];
const copyOf = (id: string) => {
  const partner = PARTNERS.find((p) => p.id === id);
  const brand = PARTNER_BRANDS[id];
  if (!partner || !brand) throw new Error(`parceiro sem logo: ${id}`);
  return partnerCopy({ name: partner.name, fullName: partner.fullName ?? null }, brand);
};

const vars = (style: string) =>
  Object.fromEntries(style.split('; ').map((pair) => pair.split(': ') as [string, string]));

describe('papéis na faixa', () => {
  it('realização ciano, organização violeta e parceria dourada', () => {
    expect(PARTNER_ROLES.organizer).toEqual({ label: 'Realização', tone: 'blue' });
    expect(PARTNER_ROLES.coorganizer).toEqual({ label: 'Organização', tone: 'violet' });
    expect(PARTNER_ROLES.partner).toEqual({ label: 'Parceria', tone: 'gold' });
  });

  it('todo parceiro do partners.json tem papel conhecido, logo, legenda e altura na faixa', () => {
    // o JSON entra por cast: um papel com erro de digitação só apareceria no build, sem rótulo nem ordem
    for (const { id, role } of PARTNERS) {
      expect(Object.keys(PARTNER_ROLES), id).toContain(role);
      expect(PARTNER_BRANDS[id], id).toBeDefined();
      expect(copyOf(id).caption.length, id).toBeGreaterThan(0);
      expect(PARTNER_BRANDS[id]?.height, id).toBeGreaterThan(0);
    }
  });

  it('LAES: legenda e texto alternativo com o nome por extenso que vem do partners.json', () => {
    expect(copyOf('laes')).toEqual({
      caption: 'Liga Acadêmica de Engenharia de Software e Inteligência Artificial',
      alt: 'LAES · Liga Acadêmica de Engenharia de Software e Inteligência Artificial',
    });
  });

  it('UniCatólica: a legenda sai da mesma lista de cursos do selo do hero', () => {
    expect(copyOf('unicatolica')).toEqual({
      caption: 'Cursos de Engenharia de Software e Inteligência Artificial',
      alt: 'UniCatólica',
    });
  });

  it('sem nome por extenso, o texto alternativo é o nome e a legenda é a da marca', () => {
    expect(partnerCopy({ name: 'Apoio X', fullName: null }, { caption: 'Legenda' })).toEqual({
      caption: 'Legenda',
      alt: 'Apoio X',
    });
  });

  it('a marca sólida e quadrada (LAES) é a menor, pra não pesar mais que as de traço fino', () => {
    const heights = Object.values(PARTNER_BRANDS).map((brand) => brand.height);
    expect(PARTNER_BRANDS['laes']?.height).toBe(Math.min(...heights));
  });
});

describe('markVars', () => {
  // PNG da LAES: 520x483, desenho em x 84, y 73, 367x382
  const image = { width: 520, height: 483 };
  const ink = { x: 84, y: 73, width: 367, height: 382 };

  it('a imagem cresce na proporção e as margens negativas cortam a borda transparente', () => {
    const style = vars(markVars(image, ink, 5.6));
    expect(style).toEqual({
      '--h': '5.6rem',
      '--k': '1.264',
      '--mt': '-0.191',
      '--mr': '-0.181',
      '--mb': '-0.073',
      '--ml': '-0.22',
    });
    // altura do PNG menos as margens de cima e de baixo = altura do desenho
    const k = Number(style['--k']) + Number(style['--mt']) + Number(style['--mb']);
    expect(k).toBeCloseTo(1, 2);
  });

  it('PNG sem borda não ganha margem', () => {
    const style = vars(markVars({ width: 200, height: 100 }, { x: 0, y: 0, width: 200, height: 100 }, 4));
    expect(style).toMatchObject({ '--k': '1', '--mt': '0', '--mr': '0', '--mb': '0', '--ml': '0' });
  });

  it('largura da imagem inteira pro srcset', () => {
    expect(markWidthRem(image, ink, 5.6)).toBeCloseTo((5.6 * 520) / 382, 3);
  });
});

describe('PartnersBand', () => {
  const read = (path: string) =>
    readFileSync(fileURLToPath(new URL(`../../src/presentation/${path}`, import.meta.url)), 'utf8');

  it('lista semântica, 2 + 1 no celular e 3 colunas a partir de 64rem', () => {
    const band = read('components/partners/PartnersBand.astro');
    expect(band).toContain('<ul class="partners__row" role="list">');
    expect(band).toMatch(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(band).toMatch(/@media \(min-width: 64rem\)[\s\S]*grid-auto-flow: column/);
  });

  it('logo pelo astro:assets, com carregamento adiado (fica no rodapé)', () => {
    const logo = read('components/partners/PartnerLogo.astro');
    expect(logo).toContain("import { Image } from 'astro:assets'");
    expect(logo).toContain('loading="lazy"');
    expect(logo).toContain('alt={alt}');
  });
});
