import type { FaqItemDTO, LandingPageDTO, PartnerDTO, SessionDTO, VenueDTO } from '@application/index';

// schema.org da LP: o Event (com um subEvent por bloco da programação) e o FAQPage, no mesmo @graph.
// Tudo sai do conteúdo: mudou o event.json ou o faq.json, os dados estruturados acompanham
type Node = Record<string, unknown>;

const ORGANIZING: ReadonlySet<PartnerDTO['role']> = new Set(['organizer', 'coorganizer']);

// America/Araguaina não tem horário de verão: -03:00 o ano todo
const offsetOf = (timeZone: string): string => (timeZone === 'America/Araguaina' ? '-03:00' : 'Z');

function place(venue: VenueDTO, detail: string | null = null): Node {
  return {
    '@type': 'Place',
    name: detail ? `${venue.name} · ${detail}` : venue.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Palmas',
      addressRegion: 'TO',
      addressCountry: 'BR',
    },
  };
}

function subEvent(date: string, session: SessionDTO, offset: string): Node {
  const at = (time: string | null) => (time ? `${date}T${time}:00${offset}` : undefined);
  return {
    '@type': 'Event',
    name: session.title,
    description: session.description,
    startDate: at(session.start) ?? date,
    endDate: at(session.end),
    location: place(session.venue, session.place),
    ...(session.audienceNote && { audience: { '@type': 'Audience', audienceType: session.audienceNote } }),
  };
}

// sigla com nome por extenso (LAES): o nome oficial vai no name e a sigla no alternateName
function organization(partner: PartnerDTO): Node {
  return {
    '@type': 'Organization',
    name: partner.fullName ?? partner.name,
    alternateName: partner.fullName ? partner.name : undefined,
  };
}

function faqPage(faq: FaqItemDTO[]): Node {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function buildEventJsonLd(data: LandingPageDTO, siteUrl: string, description: string): Node {
  const { event, partners, schedule, faq } = data;
  const offset = offsetOf(event.timezone);
  const first = schedule[0]?.sessions[0];
  const last = schedule.at(-1)?.sessions.at(-1);
  const venues = event.venues.map((v) => place(v));
  const image = siteUrl ? new URL('/og-hackarun.jpg', siteUrl).href : undefined;

  const eventNode: Node = {
    '@type': 'Event',
    name: `${event.name} ${event.edition}`,
    description,
    // sem hora de fim no último bloco ("a partir das 17h"): o fim fica só com a data
    startDate: first?.start ? `${event.firstDate}T${first.start}:00${offset}` : event.firstDate,
    endDate: last?.end ? `${event.lastDate}T${last.end}:00${offset}` : event.lastDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: venues,
    image,
    // realização e organização assinam o evento; parceria e apoio entram como patrocínio
    organizer: partners
      .filter((p) => ORGANIZING.has(p.role))
      .map((p) => ({ ...organization(p), url: p.url ?? undefined })),
    sponsor: partners.filter((p) => !ORGANIZING.has(p.role)).map((p) => organization(p)),
    subEvent: schedule.flatMap((day) => day.sessions.map((s) => subEvent(day.date, s, offset))),
    url: siteUrl || undefined,
    inLanguage: 'pt-BR',
  };

  return { '@context': 'https://schema.org', '@graph': [eventNode, faqPage(faq)] };
}
