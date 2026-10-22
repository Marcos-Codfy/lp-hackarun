// links das logos da faixa "Quem faz acontecer" e CTA do Instagram da LAES
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import partnersData from '@infrastructure/content/partners.json';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');
const partner = (id: string) => partnersData.find((p) => p.id === id);

describe('logos da faixa de parceiros', () => {
  it('a logo da UniCatólica leva ao portal da instituição', () => {
    expect(partner('unicatolica')?.url).toBe('https://to.catolica.edu.br/portal/');
  });

  it('a logo da LAES leva ao Instagram da liga', () => {
    expect(partner('laes')?.url).toBe('https://www.instagram.com/laes.eng/');
  });

  it('todo link de parceiro é https e o componente abre em nova aba com noopener', () => {
    for (const { url } of partnersData) if (url) expect(url).toMatch(/^https:\/\//);
    const logo = read('src/presentation/components/partners/PartnerLogo.astro');
    expect(logo).toContain("target: '_blank'");
    expect(logo).toContain("rel: 'noopener noreferrer'");
  });
});

describe('CTA para seguir a LAES no Instagram', () => {
  const cta = read('src/presentation/components/social/FollowLaes.astro');

  it('aponta para o perfil da LAES, abre em nova aba e avisa o leitor de tela', () => {
    expect(cta).toContain("'https://www.instagram.com/laes.eng/'");
    expect(cta).toContain('target="_blank"');
    expect(cta).toContain('rel="noopener noreferrer"');
    expect(cta).toContain('abre em nova aba');
    expect(cta).toContain('Seguir a LAES no Instagram');
  });

  it('vive no rodapé, que está em todas as páginas', () => {
    expect(read('src/presentation/components/layout/SiteFooter.astro')).toContain('<FollowLaes />');
  });
});
