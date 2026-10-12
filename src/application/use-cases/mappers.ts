// entidade -> DTO; fica aqui pra todos os casos de uso falarem a mesma língua
import type {
  EventDay,
  FaqItem,
  Milestone,
  Partner,
  Prize,
  RegistrationStatus,
  RegistrationWindow,
  ScoringRule,
  Session,
  Speaker,
  Station,
  Team,
  Venue,
} from '@domain/index';
import type {
  EventDayDTO,
  FaqItemDTO,
  MilestoneDTO,
  PartnerDTO,
  PrizeDTO,
  RegistrationDTO,
  ScoringDTO,
  SessionDTO,
  SpeakerDTO,
  StationDTO,
  TeamDTO,
  VenueDTO,
} from '../dto';

export const toVenueDTO = (v: Venue): VenueDTO => ({
  id: v.id,
  name: v.name,
  shortName: v.shortName,
  city: v.city,
  role: v.role,
  mapUrl: v.mapUrl,
});

export const toSessionDTO = (s: Session, venue: Venue): SessionDTO => ({
  id: s.id,
  title: s.title,
  kind: s.kind,
  start: s.slot.start,
  end: s.slot.end,
  startHint: s.slot.startHint,
  venue: toVenueDTO(venue),
  description: s.description,
  topics: [...s.topics],
});

export const toEventDayDTO = (d: EventDay, venueOf: (id: string) => Venue): EventDayDTO => ({
  id: d.id,
  date: d.date,
  stage: d.stage,
  title: d.title,
  summary: d.summary,
  sessions: d.sessions.map((s) => toSessionDTO(s, venueOf(s.venueId))),
});

export const toMilestoneDTO = (m: Milestone): MilestoneDTO => ({
  key: m.key,
  label: m.label,
  at: m.at.toISOString(),
});

export const toRegistrationDTO = (w: RegistrationWindow, status: RegistrationStatus): RegistrationDTO => ({
  status,
  endpoint: w.endpoint,
  closesAt: w.closesAt?.toISOString() ?? null,
  slots: {
    capacity: w.slots.capacity,
    taken: w.slots.taken,
    remaining: w.slots.remaining,
    level: w.slots.level,
  },
  teamSize: w.teamSize,
});

export const toStationDTO = (s: Station): StationDTO => ({
  id: s.id,
  order: s.order,
  code: s.code,
  title: s.title,
  challenge: s.challenge,
  space: s.space,
  kind: s.kind,
  skills: [...s.skills],
});

export const toScoringDTO = (r: ScoringRule): ScoringDTO => ({
  maxPoints: r.maxPoints,
  criteria: r.criteria.map((c) => ({ ...c, share: r.shareOf(c.key) })),
});

export const toTeamDTO = (t: Team): TeamDTO => ({
  id: t.id,
  name: t.name.value,
  members: [...t.members],
  memberCount: t.size,
  course: t.course,
  mentor: t.mentor,
  status: t.status,
  imageUrl: t.imageUrl,
});

export const toSpeakerDTO = (s: Speaker): SpeakerDTO => ({
  id: s.id,
  name: s.name,
  role: s.role,
  headline: s.headline,
  topic: s.topic,
  avatarUrl: s.avatarUrl,
  revealed: s.isRevealed,
});

export const toPrizeDTO = (p: Prize): PrizeDTO => ({
  id: p.id,
  rank: p.rank,
  title: p.title,
  description: p.description,
  reward: p.reward,
  revealed: p.isRevealed,
});

export const toPartnerDTO = (p: Partner): PartnerDTO => ({
  id: p.id,
  name: p.name,
  role: p.role,
  url: p.url,
  logo: p.logo,
});

export const toFaqItemDTO = (f: FaqItem): FaqItemDTO => ({
  id: f.id,
  question: f.question,
  answer: f.answer,
  category: f.category,
});
