// navegação do site (header, menu mobile e rodapé usam a mesma lista): âncora = seção da LP, caminho = página
export interface NavLink {
  href: `#${string}` | `/${string}`;
  label: string;
  // link de página que também tem seção na LP: o nav spy acende ele quando a seção passa (ex.: /equipes)
  spy?: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#missoes', label: 'Missões' },
  { href: '#programacao', label: 'Programação' },
  { href: '#final', label: 'Final' },
  { href: '/equipes', label: 'Equipes', spy: 'equipes' },
  { href: '#faq', label: 'FAQ' },
];

// em que página o header/rodapé está: na LP as âncoras rolam; fora dela voltam pra LP (/#secao)
export type SitePage = 'home' | 'teams';

const PAGE_PATHS: Record<SitePage, string> = { home: '/', teams: '/equipes' };

export interface ResolvedNavLink {
  href: string;
  label: string;
  // link da própria página: aria-current="page" (undefined = sem o atributo)
  ariaCurrent: 'page' | undefined;
  // seção da LP que acende este link no nav spy (só na home; undefined = sem o atributo)
  spy: string | undefined;
}

export function pageHref(href: string, page: SitePage): string {
  return page !== 'home' && href.startsWith('#') ? `/${href}` : href;
}

// topo da página: o hero na LP; nas outras, o começo do conteúdo
export const topHref = (page: SitePage): string => (page === 'home' ? '#inicio' : '#conteudo');

// atributos do <a> no header e no menu (o rodapé não precisa do data-nav-spy); undefined some do HTML
export const navLinkAttrs = (link: ResolvedNavLink) => ({
  href: link.href,
  'aria-current': link.ariaCurrent,
  'data-nav-spy': link.spy,
});

export function navLinksFor(page: SitePage): ResolvedNavLink[] {
  return NAV_LINKS.map((link) => ({
    href: pageHref(link.href, page),
    label: link.label,
    ariaCurrent: page !== 'home' && link.href === PAGE_PATHS[page] ? 'page' : undefined,
    spy: page === 'home' ? link.spy : undefined,
  }));
}
