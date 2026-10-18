import {
  Activity,
  EventDay,
  HackathonEvent,
  Milestone,
  RegistrationWindow,
  Session,
  Slots,
  TimeSlot,
  Venue,
  toAudience,
} from '@domain/index';
import type {
  RawActivity,
  RawEvent,
  RawEventDay,
  RawSession,
  RawTimeRange,
  RawVenue,
} from '../content/schema';

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
      maxStands: raw.maxStands ?? null,
    });
  }

  private static toVenue(raw: RawVenue): Venue {
    return Venue.create({ ...raw, mapUrl: raw.mapUrl ?? null });
  }

  private static toDay(raw: RawEventDay): EventDay {
    return EventDay.create({ ...raw, sessions: raw.sessions.map(EventMapper.toSession) });
  }

  private static slot(raw: RawTimeRange): TimeSlot {
    return TimeSlot.create(raw.start, raw.end, raw.startHint ?? null);
  }

  private static toSession(raw: RawSession): Session {
    return Session.create({
      id: raw.id,
      title: raw.title,
      kind: raw.kind,
      slot: EventMapper.slot(raw),
      venueId: raw.venueId,
      place: raw.place ?? null,
      audience: toAudience(raw.audience, `Session ${raw.id}`),
      audienceNote: raw.audienceNote ?? null,
      description: raw.description,
      note: raw.note ?? null,
      activities: raw.activities.map(EventMapper.toActivity),
    });
  }

  private static toActivity(raw: RawActivity): Activity {
    return Activity.create({
      id: raw.id,
      title: raw.title,
      kind: raw.kind,
      slot: EventMapper.slot(raw),
      summary: raw.summary,
      details: raw.details ?? null,
      track: raw.track ? toAudience(raw.track, `Activity ${raw.id}`) : null,
      flags: raw.flags ?? [],
      parts: (raw.parts ?? []).map((p) => ({ label: p.label, slot: EventMapper.slot(p) })),
      checklist: raw.checklist ?? [],
      speaker: raw.speaker
        ? {
            name: raw.speaker.name ?? null,
            photo: raw.speaker.photo ?? null,
            bio: raw.speaker.bio ?? null,
          }
        : null,
    });
  }
}
