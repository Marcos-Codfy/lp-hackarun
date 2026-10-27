// SEO da página /seja-mentor: título e descrição no tamanho que a busca mostra inteiro (≤ 60 e ≤ 160)
import { MENTOR_PATH } from '@presentation/view-models/mentor/mentorOrigin';

export const MENTOR_PAGE_PATH = MENTOR_PATH;

export function mentorPageSeo() {
  return {
    title: 'Seja mentor · HackaRun 2026',
    description:
      'Egresso da UniCatólica ou profissional de tecnologia? Cadastre-se como mentor do HackaRun 2026, em Palmas, e ajude as equipes do hackathon.',
    path: MENTOR_PAGE_PATH,
  };
}

// trilha (Início > Seja mentor) + página do cadastro de mentores
export function mentorPageJsonLd(siteUrl: string, title: string, description: string) {
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}${MENTOR_PAGE_PATH}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: title, description, url, inLanguage: 'pt-BR' },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'HackaRun 2026', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Seja mentor', item: url },
        ],
      },
    ],
  };
}
