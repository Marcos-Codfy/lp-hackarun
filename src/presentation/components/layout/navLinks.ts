// navegação do site (header, menu mobile e rodapé usam a mesma lista): âncora = seção da LP, caminho = página
import { MENTOR_PATH, mentorHref } from '@presentation/view-models/mentor/mentorOrigin';
import {
  REGISTRATION_PATH,
  registrationHref,
} from '@presentation/view-models/registration/registrationOrigin';

export interface NavLink {
  href: `#${string}` | `/${string}`;
  label: string;
  // link de página que também tem seção na LP: o nav spy acende ele quando a seção passa (ex.: /equipes,
  // quando a página das equipes voltar pro menu)
  spy?: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '#sobre', label: 'Sobre' },
  // { href: '#missoes', label: 'Missões' },
  { href: '#programacao', label: 'Programação' },
  { href: '#avaliadores', label: 'Avaliadores' },
  { href: '#final', label: 'Final' },
  { href: '#patrocinadores', label: 'Patrocinadores' },
  // /equipes fica fora do menu até o sorteio (12/11): a página existe, mas sem link nem indexação
  { href: '#faq', label: 'FAQ' },
];

// em que página o header/rodapé está: na LP as âncoras rolam; fora dela voltam pra LP (/#secao)
export type SitePage = 'home' | 'teams' | 'registration' | 'authorization' | 'mentor';

export const AUTHORIZATION_PATH = '/autorizacao';

const PAGE_PATHS: Record<SitePage, string> = {
  home: '/',
  teams: '/equipes',
  registration: REGISTRATION_PATH,
  authorization: AUTHORIZATION_PATH,
  mentor: MENTOR_PATH,
};

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

const resolve = (link: NavLink, page: SitePage): ResolvedNavLink => ({
  href: pageHref(link.href, page),
  label: link.label,
  ariaCurrent: page !== 'home' && link.href === PAGE_PATHS[page] ? 'page' : undefined,
  spy: page === 'home' ? link.spy : undefined,
});

export function navLinksFor(page: SitePage): ResolvedNavLink[] {
  return NAV_LINKS.map((link) => resolve(link, page));
}

// rodapé: a navegação do site + a página de inscrição (no header ela é o botão de destaque) + o cadastro de mentor
export function footerLinksFor(page: SitePage): ResolvedNavLink[] {
  const registration: ResolvedNavLink = {
    href: page === 'registration' ? REGISTRATION_PATH : registrationHref('footer'),
    label: 'Inscrição',
    ariaCurrent: page === 'registration' ? 'page' : undefined,
    spy: undefined,
  };
  const mentor: ResolvedNavLink = {
    href: page === 'mentor' ? MENTOR_PATH : mentorHref('footer'),
    label: 'Seja mentor',
    ariaCurrent: page === 'mentor' ? 'page' : undefined,
    spy: undefined,
  };
  return [...navLinksFor(page), registration, mentor];
}

// CTA do header e do menu (/inscricao com a origem; encerrada, /inscricao limpa com o aviso): na página de
// destino ele vira o item atual, com aria-current e o endereço limpo
export function headerCtaLink(
  cta: { href: string; isRegistration: boolean },
  page: SitePage,
): { href: string; ariaCurrent: 'page' | undefined } {
  const target = cta.isRegistration ? REGISTRATION_PATH : cta.href;
  const current = page !== 'home' && PAGE_PATHS[page] === target;
  return current
    ? { href: target, ariaCurrent: 'page' }
    : { href: pageHref(cta.href, page), ariaCurrent: undefined };
}

// atributos do <Button> desse CTA: na página atual ele perde o preenchimento (contorno = "você está aqui")
export function headerCtaAttrs(
  cta: { href: string; isRegistration: boolean },
  page: SitePage,
  origin: string,
) {
  const { href, ariaCurrent } = headerCtaLink(cta, page);
  return {
    href,
    'aria-current': ariaCurrent,
    variant: ariaCurrent ? ('ghost' as const) : ('primary' as const),
    registrationCta: cta.isRegistration ? origin : undefined,
  };
}

// barra de baixo do header em /inscricao, /equipes e /seja-mentor. Enquanto /equipes está escondida (até o
// sorteio), a barra tem a inscrição e, em /seja-mentor, o cadastro de mentor ao lado dela
export type SubNavPage = Extract<SitePage, 'registration' | 'teams' | 'mentor'>;

export interface SubNavLink {
  href: string;
  label: string;
  // rótulo curto que aparece no celular estreito; o nome acessível continua o completo
  short: string;
  ariaCurrent: 'page' | undefined;
}

// sem JS, "Voltar ao evento" leva pro fim da LP (o clímax da inscrição); com JS volta no histórico
export const EVENT_RETURN_HREF = '/#inscricao';

export function subNavLinksFor(page: SubNavPage): SubNavLink[] {
  const registration: SubNavLink = {
    href: page === 'registration' ? REGISTRATION_PATH : registrationHref('subnav'),
    label: 'Inscrição',
    short: 'Inscrição',
    ariaCurrent: page === 'registration' ? 'page' : undefined,
  };
  if (page !== 'mentor') return [registration];
  return [registration, { href: MENTOR_PATH, label: 'Mentor', short: 'Mentor', ariaCurrent: 'page' }];
}
