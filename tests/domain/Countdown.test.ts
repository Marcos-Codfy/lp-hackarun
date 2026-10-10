import { describe, expect, it } from 'vitest';
import { Countdown } from '@domain/index';

describe('Countdown', () => {
  it('quebra a diferença em dias, horas, minutos e segundos', () => {
    const c = Countdown.between(new Date('2026-11-01T10:00:00Z'), new Date('2026-11-03T13:04:05Z'));
    expect([c.days, c.hours, c.minutes, c.seconds]).toEqual([2, 3, 4, 5]);
    expect(c.isOver).toBe(false);
  });

  it('nunca fica negativo depois do alvo', () => {
    const c = Countdown.between(new Date('2026-11-05T00:00:00Z'), new Date('2026-11-01T00:00:00Z'));
    expect(c.totalMs).toBe(0);
    expect(c.isOver).toBe(true);
    expect([c.days, c.hours, c.minutes, c.seconds]).toEqual([0, 0, 0, 0]);
  });
});
