import { describe, expect, it } from 'vitest';
import { GetCountdown } from '@application/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { MILESTONES } from '../helpers/fixtures';

const at = (iso: string) =>
  new GetCountdown(new FixedClock(new Date(iso)), [...MILESTONES].reverse()).execute();

describe('GetCountdown', () => {
  it('antes da largada persegue a largada', () => {
    const c = at('2026-11-10T19:00:00-03:00');
    expect(c.key).toBe('kickoff');
    expect(c.label).toBe('O HackaRun começa em');
    expect([c.days, c.hours, c.minutes, c.seconds]).toEqual([1, 0, 0, 0]);
    expect(c.target).toBe('2026-11-11T22:00:00.000Z');
  });

  it('durante a corrida troca pra entrega das 15h', () => {
    const c = at('2026-11-14T14:30:15-03:00');
    expect(c.key).toBe('submission');
    expect([c.days, c.hours, c.minutes, c.seconds]).toEqual([0, 0, 29, 45]);
  });

  it('depois da entrega mira a premiação', () => {
    expect(at('2026-11-14T15:00:00-03:00').key).toBe('ceremony');
  });

  it('depois de tudo fica encerrado', () => {
    const c = at('2026-11-14T18:00:01-03:00');
    expect(c).toMatchObject({ key: null, isOver: true, target: null, label: 'Encerrado' });
  });
});
