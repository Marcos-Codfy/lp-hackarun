// links entre a LP, /inscricao e /equipes: a SubNav das páginas leves, o CTA do header (atual na própria
// página), o rodapé e a origem de cada CTA (coluna "Origem" da planilha)
import { describe, expect, it } from 'vitest';
import {
  EVENT_RETURN_HREF,
  footerLinksFor,
  headerCtaAttrs,
  headerCtaLink,
  navLinksFor,
  subNavLinksFor,
} from '@presentation/components/layout/navLinks';
import { RegistrationCopy } from '@presentation/formatters/RegistrationCopy';
import {
  DIRECT_SOURCE,
  REGISTRATION_ORIGINS,
  registrationHref,
  sourceFromSearch,
} from '@presentation/view-models/registration/registrationOrigin';

describe('origem do CTA de inscrição', () => {
  it('cada CTA leva pra /inscricao com a origem; sem origem é o endereço limpo', () => {
    expect(registrationHref('hero')).toBe('/inscricao?origem=hero');
    expect(registrationHref()).toBe('/inscricao');
  });

  it.each([
    ['?origem=hero', 'hero'],
    ['?origem=FINAL', 'final'],
    ['?quality=high&origem=faq', 'faq'],
    ['?origem=404', '404'],
    ['', DIRECT_SOURCE],
    ['?origem=', DIRECT_SOURCE],
    ['?origem=instagram', DIRECT_SOURCE],
    ['?origem=%3Cscript%3E', DIRECT_SOURCE],
  ])('%s → %s', (search, source) => {
    expect(sourceFromSearch(search)).toBe(source);
  });

  it('toda origem da lista cabe no limite da coluna Origem do Apps Script (40)', () => {
    for (const origin of REGISTRATION_ORIGINS) {
      expect(origin.length).toBeLessThanOrEqual(40);
      expect(sourceFromSearch(`?origem=${origin}`)).toBe(origin);
    }
  });

  it('CTAs da LP: inscrição aberta ou em breve vai pra /inscricao; encerrada, pras equipes', () => {
    const copy = new RegistrationCopy();
    expect(copy.cta('open', 'hero').href).toBe('/inscricao?origem=hero');
    expect(copy.cta('soon', 'about').href).toBe('/inscricao?origem=about');
    expect(copy.cta('closing', 'menu').href).toBe('/inscricao?origem=menu');
    expect(copy.cta('closed', 'hero')).toMatchObject({ href: '/equipes', isRegistration: false });
  });

  it('rótulo longo (fim da LP, equipes, 404): em breve convida, sem prometer o envio', () => {
    const copy = new RegistrationCopy();
    expect(copy.actionLabel('soon')).toBe('Quero participar');
    expect(copy.actionLabel('open')).toBe('Inscrever minha equipe');
    expect(copy.actionLabel('closing')).toBe('Inscrever minha equipe');
    expect(copy.actionLabel('closed')).toBe('Ver as equipes');
  });
});

describe('SubNav de /inscricao e /equipes', () => {
  it('em /inscricao, "Inscrição" é a página atual (endereço limpo)', () => {
    const [registration, teams] = subNavLinksFor('registration');
    expect(registration).toMatchObject({ href: '/inscricao', ariaCurrent: 'page' });
    expect(teams).toMatchObject({ href: '/equipes', ariaCurrent: undefined, label: 'Equipes inscritas' });
  });

  it('em /equipes, "Equipes inscritas" é a atual e "Inscrição" leva a origem subnav', () => {
    const [registration, teams] = subNavLinksFor('teams');
    expect(registration).toMatchObject({ href: '/inscricao?origem=subnav', ariaCurrent: undefined });
    expect(teams).toMatchObject({ href: '/equipes', ariaCurrent: 'page' });
  });

  it('rótulo curto do celular é o começo do nome acessível (WCAG 2.5.3)', () => {
    for (const link of subNavLinksFor('teams')) expect(link.label.startsWith(link.short)).toBe(true);
  });

  it('sem JS, "Voltar ao evento" leva pro fim da LP', () => {
    expect(EVENT_RETURN_HREF).toBe('/#inscricao');
  });
});

describe('header, menu e rodapé', () => {
  const open = new RegistrationCopy().cta('open', 'header');
  const closed = new RegistrationCopy().cta('closed', 'header');

  it('o CTA do header é a página atual em /inscricao (e só lá)', () => {
    expect(headerCtaLink(open, 'registration')).toEqual({ href: '/inscricao', ariaCurrent: 'page' });
    expect(headerCtaLink(open, 'home')).toEqual({ href: '/inscricao?origem=header', ariaCurrent: undefined });
    expect(headerCtaLink(open, 'teams')).toEqual({
      href: '/inscricao?origem=header',
      ariaCurrent: undefined,
    });
  });

  it('inscrições encerradas: o CTA vira "Equipes", atual em /equipes', () => {
    expect(headerCtaLink(closed, 'teams')).toEqual({ href: '/equipes', ariaCurrent: 'page' });
    expect(headerCtaLink(closed, 'home').ariaCurrent).toBeUndefined();
  });

  it('na página atual o botão perde o preenchimento e não marca origem', () => {
    expect(headerCtaAttrs(open, 'registration', 'header')).toMatchObject({
      'aria-current': 'page',
      variant: 'ghost',
    });
    expect(headerCtaAttrs(open, 'home', 'header')).toMatchObject({
      variant: 'primary',
      registrationCta: 'header',
    });
    expect(headerCtaAttrs(closed, 'home', 'header').registrationCta).toBeUndefined();
  });

  it('em /inscricao as seções voltam pra LP e nenhum link de seção é o atual', () => {
    const links = navLinksFor('registration');
    expect(links.find((l) => l.label === 'FAQ')?.href).toBe('/#faq');
    expect(links.every((l) => l.ariaCurrent === undefined)).toBe(true);
  });

  it('o rodapé ganha "Inscrição" (atual na própria página, com a origem nas outras)', () => {
    expect(footerLinksFor('home').at(-1)).toMatchObject({
      label: 'Inscrição',
      href: '/inscricao?origem=footer',
    });
    expect(footerLinksFor('registration').at(-1)).toMatchObject({ href: '/inscricao', ariaCurrent: 'page' });
  });
});
