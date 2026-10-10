import type { LandingPageDTO } from '@application/index';

// schema.org/Event: ajuda o Google a mostrar data e local direto na busca
export function buildEventJsonLd(data: LandingPageDTO, siteUrl: string): Record<string, unknown> {
  const { event, partners } = data;
  const first = event.milestones.find((m) => m.key === 'kickoff')?.at ?? `${event.firstDate}T19:00:00-03:00`;
  const host = event.venues.find((v) => v.role === 'host');
  const final = event.venues.find((v) => v.role === 'final');
  const place = (name: string | undefined) => ({
    '@type': 'Place',
    name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Palmas',
      addressRegion: 'TO',
      addressCountry: 'BR',
    },
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `${event.name} ${event.edition}`,
    description: event.tagline,
    startDate: first,
    endDate: `${event.lastDate}T21:00:00-03:00`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: [place(host?.name), place(final?.name)],
    organizer: partners
      .filter((p) => p.role === 'organizer')
      .map((p) => ({ '@type': 'Organization', name: p.name, url: p.url ?? undefined })),
    sponsor: partners
      .filter((p) => p.role !== 'organizer')
      .map((p) => ({ '@type': 'Organization', name: p.name })),
    url: siteUrl,
    inLanguage: 'pt-BR',
  };
}
