import {
  EventDay,
  HackathonEvent,
  Milestone,
  RegistrationWindow,
  Session,
  Slots,
  TimeSlot,
  Venue,
} from '@domain/index';
import type { RawEvent, RawEventDay, RawSession, RawVenue } from '../content/schema';

// JSON cru -> aggregate; qualquer dado inválido explode aqui, no build
export class EventMapper {
  static readonly DEFAULT_TEAM_SIZE = { min: 1, max: 6 };

  static toDomain(raw: RawEvent): HackathonEvent {
    return HackathonEvent.create({
      id: raw.id,
      name: raw.name,
      edition: raw.edition,
      tagline: raw.tagline,
      city: raw.city,
      timezone: raw.timezone,
      venues: raw.venues.map(EventMapper.toVenue),
      days: raw.days.map(EventMapper.toDay),
      milestones: raw.milestones.map((m) => Milestone.create(m.key, m.label, new Date(m.at))),
      registration: RegistrationWindow.create({
        endpoint: raw.registration.endpoint ?? null,
        closesAt: raw.registration.closesAt ? new Date(raw.registration.closesAt) : null,
        slots: Slots.create(raw.registration.capacity ?? null, 0),
        teamSize: raw.registration.teamSize ?? EventMapper.DEFAULT_TEAM_SIZE,
      }),
    });
  }

  private static toVenue(raw: RawVenue): Venue {
    return Venue.create({ ...raw, mapUrl: raw.mapUrl ?? null });
  }

  private static toDay(raw: RawEventDay): EventDay {
    return EventDay.create({ ...raw, sessions: raw.sessions.map(EventMapper.toSession) });
  }

  private static toSession(raw: RawSession): Session {
    return Session.create({
      id: raw.id,
      title: raw.title,
      kind: raw.kind,
      slot: TimeSlot.create(raw.start, raw.end, raw.startHint ?? null),
      venueId: raw.venueId,
      description: raw.description,
      topics: raw.topics ?? [],
    });
  }
}
