import { describe, expect, it } from 'vitest';
import eventData from '@infrastructure/content/event.json';
import type { RawEvent } from '@infrastructure/content/schema';
import { GetEventOverview } from '@application/index';
import {
  RegistrationPolicy,
  ScoringRule,
  Station,
  Team,
  type StationRepository,
  type TeamRepository,
} from '@domain/index';
import { StaticEventRepository } from '@infrastructure/repositories/StaticEventRepository';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { teamName } from '../helpers/fixtures';

const raw = eventData as RawEvent;

const team = (id: string, status: 'confirmed' | 'pending') =>
  Team.create({ id, name: teamName(`Equipe ${id}`), memberCount: 3, status });

const teams = (list: Team[]): TeamRepository => ({ list: async () => list });

const stations: StationRepository = {
  list: async () => [
    Station.create({
      id: 'a',
      order: 1,
      title: 'A',
      challenge: 'Desafio A',
      space: 'Lab',
      kind: 'qualifier',
      skills: [],
    }),
    Station.create({
      id: 'b',
      order: 2,
      title: 'B',
      challenge: 'Desafio B',
      space: 'Lab',
      kind: 'final',
      skills: [],
    }),
  ],
  scoring: async () => ScoringRule.create(100, [{ key: 'x', label: 'X', points: 100 }]),
};

function overview(event: RawEvent, list: Team[], now = '2026-10-10T12:00:00-03:00') {
  return new GetEventOverview({
    events: new StaticEventRepository(event),
    stations,
    teams: teams(list),
    policy: new RegistrationPolicy(),
    clock: new FixedClock(new Date(now)),
  }).execute();
}

describe('GetEventOverview', () => {
  it('conta só equipes confirmadas como vagas ocupadas', async () => {
    const withCapacity: RawEvent = {
      ...raw,
      registration: { ...raw.registration, endpoint: 'https://x/exec', capacity: 4 },
    };
    const dto = await overview(withCapacity, [
      team('1', 'confirmed'),
      team('2', 'pending'),
      team('3', 'confirmed'),
    ]);
    expect(dto.registration.slots).toEqual({ capacity: 4, taken: 2, remaining: 2, level: 'filling' });
    expect(dto.registration.status).toBe('open');
  });

  it('sem endpoint fica "em breve" e sem capacidade o nível é desconhecido', async () => {
    const dto = await overview({ ...raw, registration: { ...raw.registration, endpoint: '' } }, []);
    expect(dto.registration.status).toBe('soon');
    expect(dto.registration.slots.level).toBe('unknown');
    expect(dto.registration.teamSize).toEqual({ min: 2, max: 5 });
  });

  it('vagas esgotadas fecham a inscrição', async () => {
    const full: RawEvent = {
      ...raw,
      registration: { ...raw.registration, endpoint: 'https://x/exec', capacity: 1 },
    };
    const dto = await overview(full, [team('1', 'confirmed')]);
    expect(dto.registration.status).toBe('closed');
  });

  it('monta as estatísticas e as datas do evento', async () => {
    const dto = await overview(raw, []);
    // oficinas contam por horário (as "Oficinas 1, 2 e 3" do dia 13 valem três): 3 + 1 + 3 no documento
    const workshops = raw.days
      .flatMap((d) => d.sessions.flatMap((s) => s.activities))
      .filter((a) => a.kind === 'workshop')
      .reduce((acc, a) => acc + Math.max(1, a.parts?.length ?? 0), 0);
    expect(dto.stats.days).toBe(raw.days.length);
    expect(dto.stats.stations).toBe(2);
    expect(dto.stats.workshops).toBe(workshops);
    expect(dto.stats.workshops).toBe(6);
    expect(dto.stats.stands).toBe(10);
    expect(dto.firstDate).toBe('2026-11-11');
    expect(dto.lastDate).toBe('2026-11-14');
    expect(dto.milestones.map((m) => m.key)).toEqual(['kickoff', 'submission', 'ceremony']);
  });
});
