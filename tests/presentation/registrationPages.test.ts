// @vitest-environment node
// a inscrição mudou de casa: o formulário saiu da LP (fica o clímax com o CTA) e mora em /inscricao, página leve
// com a SubNav que troca com /equipes. Confere no código das páginas o que o build vai gerar
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REGISTRATION_PAGE_PATH,
  registrationPageJsonLd,
  registrationPageSeo,
} from '@presentation/components/seo/registrationPageSeo';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const sources = (dir: string) =>
  readdirSync(join(SRC, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(astro|ts)$/.test(file))
    .map((file) => ({ file: `${dir}/${file.split(/[\\/]/).join('/')}`, source: read(join(dir, file)) }));

describe('LP sem formulário', () => {
  it('a LP e a seção final não puxam o formulário nem o lobby', () => {
    const index = read('pages/index.astro');
    const section = read('presentation/sections/RegistrationSection.astro');
    for (const source of [index, section]) {
      expect(source).not.toMatch(/RegistrationForm|LobbyPanel|data-registration-form/);
    }
  });

  it('a seção final mantém os ganchos do clímax 3D (id, cena, segura e checkpoint)', () => {
    const section = read('presentation/sections/RegistrationSection.astro');
    expect(section).toContain('id="inscricao"');
    expect(section).toContain('data-scene="core"');
    expect(section).toMatch(/data-scene-hold="\d+"/);
    expect(section).toContain('data-checkpoint="Inscrição"');
    expect(read('presentation/sections/registration/ChargeCta.astro')).toContain('data-charge-reveal');
  });

  it('o CTA final leva pra /inscricao (com a origem), com o rótulo do status, e o secundário pras equipes', () => {
    const cta = read('presentation/sections/registration/ChargeCta.astro');
    expect(cta).toContain("copy.cta(registration.status, 'final')");
    expect(cta).toContain('copy.actionLabel(registration.status)');
    expect(cta).toContain('href="/equipes"');
  });

  it('nenhum CTA de inscrição aponta pra âncora do formulário que saiu da LP', () => {
    const all = [
      ...sources('pages'),
      ...sources('presentation/sections'),
      ...sources('presentation/components'),
    ];
    const offenders = all.filter(({ source }) => /href=["'{`]+\/?#inscricao(-lobby)?["'`}]/.test(source));
    expect(offenders.map(({ file }) => file)).toEqual([]);
    expect(all.some(({ source }) => /registration:intent|RegistrationCtaController/.test(source))).toBe(
      false,
    );
  });
});

describe('página /inscricao', () => {
  const page = read('pages/inscricao.astro');

  it('é leve (PageLayout, sem 3D) e tem header, SubNav e rodapé da própria página', () => {
    expect(page).toContain("import PageLayout from '@presentation/layouts/PageLayout.astro'");
    expect(page).not.toContain('BaseLayout');
    expect(page).toContain('<SiteHeader registration={event.registration} page="registration" />');
    expect(page).toContain('<SubNav page="registration" />');
    expect(page).toContain('page="registration"');
    expect(read('presentation/sections/RegistrationPageSection.astro')).toContain('<RegistrationForm');
  });

  it('a seção da página não usa o id #inscricao (esse é o clímax da LP, com render adiado)', () => {
    const section = read('presentation/sections/RegistrationPageSection.astro');
    expect(section).not.toContain('id="inscricao"');
    expect(read('presentation/styles/deferred-sections.css')).not.toContain('#cadastro');
  });

  it('/equipes ganhou a mesma SubNav', () => {
    expect(read('pages/equipes.astro')).toContain('<SubNav page="teams" />');
  });

  it('SEO: título e descrição no tamanho da busca, URLs absolutas e trilha Início > Inscrição', () => {
    const seo = registrationPageSeo({ min: 2, max: 5 });
    expect(seo.path).toBe(REGISTRATION_PAGE_PATH);
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeGreaterThanOrEqual(70);
    expect(seo.description.length).toBeLessThanOrEqual(160);
    const graph = registrationPageJsonLd('https://lp-hackarun.pages.dev/', seo.title, seo.description)[
      '@graph'
    ] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({ '@type': 'WebPage', url: 'https://lp-hackarun.pages.dev/inscricao' });
    expect(JSON.stringify(graph[1])).toContain('"name":"Inscrição"');
  });

  it('o aviso de privacidade explica o rascunho na aba', () => {
    const privacy = read('pages/privacidade.astro');
    expect(privacy).toMatch(/rascunho[\s\S]*só nesta aba do navegador/);
    expect(privacy).toContain("registrationHref('privacidade')");
  });
});
