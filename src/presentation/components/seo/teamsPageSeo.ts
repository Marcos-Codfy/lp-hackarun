// SEO da página /equipes: título e descrição no tamanho que a busca mostra inteiro (≤ 60 e ≤ 160).
// Escondida até o sorteio (12/11): noindex e fora do sitemap (astro.config.mjs), sem link no site
export const TEAMS_PAGE = {
  title: 'Equipes · HackaRun 2026',
  description:
    'As equipes do hackathon do HackaRun 2026, em Palmas, formadas por sorteio entre os inscritos presentes no credenciamento, com o nome e a insígnia de cada uma.',
  path: '/equipes',
  noindex: true,
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
