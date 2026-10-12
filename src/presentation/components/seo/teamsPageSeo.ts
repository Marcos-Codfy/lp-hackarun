// SEO da página /equipes: título e descrição no tamanho que a busca mostra inteiro (≤ 60 e ≤ 160)
export const TEAMS_PAGE = {
  title: 'Equipes inscritas · HackaRun 2026',
  description:
    'Veja as equipes confirmadas no HackaRun 2026, o hackathon da Unicatólica em Palmas, com a foto ou a logo de cada time. Inscreva a sua.',
  path: '/equipes',
} as const;

// trilha (Início > Equipes) + página de coleção: o Google entende onde a página fica no site
export function teamsPageJsonLd(siteUrl: string): Record<string, unknown> {
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}${TEAMS_PAGE.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: TEAMS_PAGE.title,
        description: TEAMS_PAGE.description,
        url,
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'HackaRun 2026', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Equipes', item: url },
        ],
      },
    ],
  };
}
