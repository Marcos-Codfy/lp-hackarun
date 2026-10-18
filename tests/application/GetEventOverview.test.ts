import { describe, expect, it } from 'vitest';
import eventData from '@infrastructure/content/event.json';
import type { RawEvent } from '@infrastructure/content/schema';
import { GetEventOverview } from '@application/index';
import { RegistrationPolicy, ScoringRule, Station, type StationRepository } from '@domain/index';
import { StaticEventRepository } from '@infrastructure/repositories/StaticEventRepository';
import { FixedClock } from '@infrastructure/clock/SystemClock';

const raw = eventData as RawEvent;

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

function overview(event: RawEvent, now = '2026-10-10T12:00:00-03:00') {
  return new GetEventOverview({
    events: new StaticEventRepository(event),
    stations,
    policy: new RegistrationPolicy(),
    clock: new FixedClock(new Date(now)),
  }).execute();
}

describe('GetEventOverview', () => {
  it('vagas de pessoas: no build ninguém conta como inscrito (a página conta pela planilha)', async () => {
    const withCapacity: RawEvent = {
      ...raw,
      registration: { ...raw.registration, endpoint: 'https://x/exec', capacity: 75 },
    };
    const dto = await overview(withCapacity);
    expect(dto.registration.slots).toEqual({ capacity: 75, taken: 0, remaining: 75, level: 'plenty' });
    expect(dto.registration.status).toBe('open');
  });

  it('sem endpoint fica "em breve" e sem capacidade o nível é desconhecido', async () => {
    const dto = await overview({
      ...raw,
      registration: { ...raw.registration, endpoint: '', capacity: null },
    });
    expect(dto.registration.status).toBe('soon');
    expect(dto.registration.slots.level).toBe('unknown');
    expect(dto.registration.teamSize).toEqual({ min: 4, max: 5 });
  });

  it('prazo vencido fecha a inscrição', async () => {
    const late: RawEvent = {
      ...raw,
      registration: {
        ...raw.registration,
        endpoint: 'https://x/exec',
        closesAt: '2026-11-08T23:59:00-03:00',
      },
    };
    const dto = await overview(late, '2026-11-09T08:00:00-03:00');
    expect(dto.registration.status).toBe('closed');
  });

  it('monta as estatísticas e as datas do evento', async () => {
    const dto = await overview(raw);
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
