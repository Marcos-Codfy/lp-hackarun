import { describe, expect, it } from 'vitest';
import {
  DomainError,
  EventDay,
  HackathonEvent,
  Milestone,
  RegistrationWindow,
  Session,
  Slots,
  TimeSlot,
  Venue,
  type HackathonEventProps,
} from '@domain/index';

const venue = (id: string, role: 'host' | 'final') =>
  Venue.create({ id, name: `Local ${id}`, shortName: id, city: 'Palmas – TO', role, mapUrl: null });

const day = (id: string, date: string, venueId: string) =>
  EventDay.create({
    id,
    date,
    stage: 'workshops',
    label: id,
    title: id,
    summary: '',
    sessions: [
      Session.create({
        id: `${id}-s`,
        title: 'Sessão',
        kind: 'challenge',
        slot: TimeSlot.create('19:00', '22:00'),
        venueId,
        place: null,
        audience: 'open',
        audienceNote: null,
        description: '',
        note: null,
        activities: [],
      }),
    ],
  });

const props = (overrides: Partial<HackathonEventProps> = {}): HackathonEventProps => ({
  id: 'hackarun',
  name: 'HackaRun',
  edition: '2026',
  tagline: '',
  city: 'Palmas – TO',
  timezone: 'America/Araguaina',
  venues: [venue('uni', 'host'), venue('shop', 'final')],
  days: [day('d2', '2026-11-14', 'shop'), day('d1', '2026-11-11', 'uni')],
  milestones: [
    Milestone.create('ceremony', 'Premiação', new Date('2026-11-14T18:00:00-03:00')),
    Milestone.create('kickoff', 'Largada', new Date('2026-11-11T19:00:00-03:00')),
    Milestone.create('submission', 'Entrega', new Date('2026-11-14T15:00:00-03:00')),
  ],
  registration: RegistrationWindow.create({
    endpoint: null,
    closesAt: null,
    slots: Slots.create(null, 0),
    teamSize: { min: 2, max: 5 },
  }),
  ...overrides,
});

describe('HackathonEvent', () => {
  const event = HackathonEvent.create(props());

  it('ordena dias e marcos', () => {
    expect(event.firstDay.date).toBe('2026-11-11');
    expect(event.lastDay.date).toBe('2026-11-14');
    expect(event.milestones.map((m) => m.key)).toEqual(['kickoff', 'submission', 'ceremony']);
  });

  it('acha o próximo marco', () => {
    expect(event.nextMilestone(new Date('2026-11-01T00:00:00Z'))?.key).toBe('kickoff');
    expect(event.nextMilestone(new Date('2026-11-14T16:00:00-03:00'))?.key).toBe('ceremony');
    expect(event.nextMilestone(new Date('2026-11-15T00:00:00Z'))).toBeNull();
  });

  it.each([
    ['2026-11-01T00:00:00-03:00', 'upcoming'],
    ['2026-11-12T10:00:00-03:00', 'running'],
    ['2026-11-14T16:00:00-03:00', 'awaiting-ceremony'],
    ['2026-11-14T19:00:00-03:00', 'finished'],
  ] as const)('em %s a fase é %s', (iso, phase) => {
    expect(event.phaseAt(new Date(iso))).toBe(phase);
  });

  it('acha local por id e papel', () => {
    expect(event.venue('uni')?.role).toBe('host');
    expect(event.venueByRole('final')?.id).toBe('shop');
  });

  it('não aceita dia em local desconhecido', () => {
    expect(() => HackathonEvent.create(props({ days: [day('d1', '2026-11-11', 'fantasma')] }))).toThrow(
      DomainError,
    );
  });

  it('precisa de pelo menos um dia', () => {
    expect(() => HackathonEvent.create(props({ days: [] }))).toThrow(DomainError);
  });

  it('teto de estandes é opcional, mas quando vem é inteiro positivo', () => {
    expect(event.maxStands).toBeNull();
    expect(HackathonEvent.create(props({ maxStands: 10 })).maxStands).toBe(10);
    for (const bad of [0, -1, 2.5]) {
      expect(() => HackathonEvent.create(props({ maxStands: bad }))).toThrow(DomainError);
    }
  });
});
