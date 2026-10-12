// de onde a pessoa veio pra página de inscrição (/inscricao?origem=hero). Vira a coluna "Origem" da planilha:
// só valores desta lista passam, o resto (link colado, parâmetro inventado) conta como acesso direto
export const REGISTRATION_PATH = '/inscricao';
export const ORIGIN_PARAM = 'origem';

export const REGISTRATION_ORIGINS = [
  'header',
  'menu',
  'hero',
  'about',
  'teams',
  'faq',
  'final',
  'footer',
  'equipes',
  'subnav',
  '404',
  'privacidade',
] as const;

export type RegistrationOrigin = (typeof REGISTRATION_ORIGINS)[number];

// sem parâmetro (ou com um fora da lista): a pessoa abriu /inscricao direto
export const DIRECT_SOURCE = 'direct';

export const isRegistrationOrigin = (value: string): value is RegistrationOrigin =>
  (REGISTRATION_ORIGINS as readonly string[]).includes(value);

// link de um CTA de inscrição; sem origem é o endereço limpo (o da própria página)
export function registrationHref(origin?: RegistrationOrigin): string {
  return origin ? `${REGISTRATION_PATH}?${ORIGIN_PARAM}=${origin}` : REGISTRATION_PATH;
}

// "?origem=hero" -> "hero"; qualquer outra coisa -> "direct"
export function sourceFromSearch(search: string): string {
  const value = (new URLSearchParams(search).get(ORIGIN_PARAM) ?? '').trim().toLowerCase();
  return isRegistrationOrigin(value) ? value : DIRECT_SOURCE;
}
