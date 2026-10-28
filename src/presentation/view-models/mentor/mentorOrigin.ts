// de onde a pessoa veio pra página de mentor (/seja-mentor?origem=crew). Vira a coluna "Origem" da aba Mentores:
// só valores desta lista passam, o resto (link colado, parâmetro inventado) conta como acesso direto
import { DIRECT_SOURCE, ORIGIN_PARAM } from '../registration/registrationOrigin';

export const MENTOR_PATH = '/seja-mentor';

export const MENTOR_ORIGINS = ['crew', 'faq', 'footer', 'subnav', '404', 'privacidade'] as const;

export type MentorOrigin = (typeof MENTOR_ORIGINS)[number];

export const isMentorOrigin = (value: string): value is MentorOrigin =>
  (MENTOR_ORIGINS as readonly string[]).includes(value);

// link de um CTA do cadastro de mentor; sem origem é o endereço limpo (o da própria página)
export function mentorHref(origin?: MentorOrigin): string {
  return origin ? `${MENTOR_PATH}?${ORIGIN_PARAM}=${origin}` : MENTOR_PATH;
}

// "?origem=crew" -> "crew"; qualquer outra coisa -> "direct"
export function mentorSourceFromSearch(search: string): string {
  const value = (new URLSearchParams(search).get(ORIGIN_PARAM) ?? '').trim().toLowerCase();
  return isMentorOrigin(value) ? value : DIRECT_SOURCE;
}
