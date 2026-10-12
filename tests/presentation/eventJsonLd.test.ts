// dados estruturados da LP saem do conteúdo real: Event com um subEvent por bloco e o FAQPage em sincronia
import { describe, expect, it } from 'vitest';
import faqData from '@infrastructure/content/faq.json';
import { serverContainer } from '@composition/server';
import { buildEventJsonLd } from '@presentation/components/seo/eventJsonLd';

type Node = Record<string, unknown>;

async function graph(siteUrl = 'https://lp-hackarun.pages.dev/'): Promise<Node[]> {
  const data = await serverContainer().getLandingPage.execute();
  const ld = buildEventJsonLd(data, siteUrl, 'Descrição da página');
  expect(ld['@context']).toBe('https://schema.org');
  // passa pelo JSON como na página (undefined some)
  return (JSON.parse(JSON.stringify(ld)) as { '@graph': Node[] })['@graph'];
}

describe('buildEventJsonLd', () => {
  it('evento de 11/11 às 19h até 14/11 (a final não tem hora de fim)', async () => {
    const [event] = await graph();
    expect(event).toMatchObject({
      '@type': 'Event',
      name: 'HackaRun 2026',
      description: 'Descrição da página',
      startDate: '2026-11-11T19:00:00-03:00',
      endDate: '2026-11-14',
      image: 'https://lp-hackarun.pages.dev/og-image.jpg',
      inLanguage: 'pt-BR',
    });
    expect(event?.['organizer']).toEqual([
      { '@type': 'Organization', name: 'UniCatólica', url: 'https://www.catolica-to.edu.br' },
      {
        '@type': 'Organization',
        name: 'Liga Acadêmica de Engenharia de Software e Inteligência Artificial',
        alternateName: 'LAES',
      },
    ]);
    expect(event?.['sponsor']).toEqual([{ '@type': 'Organization', name: 'Capim Dourado Shopping' }]);
  });

  it('um subEvent por bloco, com horário de Palmas, local e público', async () => {
    const [event] = await graph();
    const subs = event?.['subEvent'] as Node[];
    expect(subs.map((s) => [s['name'], s['startDate'], s['endDate']])).toEqual([
      ['Oficinas práticas', '2026-11-11T19:00:00-03:00', '2026-11-11T21:50:00-03:00'],
      ['Abertura oficial e lançamento do HackaRun', '2026-11-12T19:00:00-03:00', '2026-11-12T22:00:00-03:00'],
      [
        'Oficinas e interação com projetos acadêmicos',
        '2026-11-13T19:00:00-03:00',
        '2026-11-13T22:00:00-03:00',
      ],
      ['Desenvolvimento final', '2026-11-14T08:00:00-03:00', '2026-11-14T13:00:00-03:00'],
      ['HackaRun Experience', '2026-11-14T17:00:00-03:00', undefined],
    ]);
    expect((subs[0]?.['location'] as Node)['name']).toBe(
      'Centro Universitário Católica do Tocantins · Auditório do Bloco II',
    );
    expect((subs[4]?.['location'] as Node)['name']).toBe('Capim Dourado Shopping');
    expect((subs[3]?.['audience'] as Node)['audienceType']).toContain('equipes participantes');
  });

  it('FAQPage com as mesmas perguntas e respostas do faq.json', async () => {
    const [, faqPage] = await graph();
    expect(faqPage?.['@type']).toBe('FAQPage');
    const questions = faqPage?.['mainEntity'] as { name: string; acceptedAnswer: { text: string } }[];
    expect(questions.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      faqData.map((f) => [f.question, f.answer]),
    );
  });

  it('sem URL do site não inventa url nem imagem', async () => {
    const [event] = await graph('');
    expect(event?.['url']).toBeUndefined();
    expect(event?.['image']).toBeUndefined();
  });
});
