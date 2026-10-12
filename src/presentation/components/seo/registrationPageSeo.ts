// SEO da página /inscricao: título e descrição no tamanho que a busca mostra inteiro (≤ 60 e ≤ 160)
export const REGISTRATION_PAGE_PATH = '/inscricao';

export function registrationPageSeo(teamSize: { min: number; max: number }) {
  return {
    title: 'Inscrição de equipe · HackaRun 2026',
    description: `Inscreva sua equipe no hackathon do HackaRun 2026, exclusivo para alunos da UniCatólica: de ${teamSize.min} a ${teamSize.max} pessoas, com nome, matrícula e e-mail.`,
    path: REGISTRATION_PAGE_PATH,
  };
}

// trilha (Início > Inscrição) + página da ação de se inscrever no evento
export function registrationPageJsonLd(siteUrl: string, title: string, description: string) {
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}${REGISTRATION_PAGE_PATH}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: title, description, url, inLanguage: 'pt-BR' },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'HackaRun 2026', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Inscrição', item: url },
        ],
      },
    ],
  };
}
