// "hoje" da programação: o Intl com fuso (caro no 1º uso) só roda perto dos dias do evento
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleDates, todayForSchedule } from '@presentation/controllers/scheduleToday';

const DAYS = ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'];
const TZ = 'America/Araguaina';

afterEach(() => vi.restoreAllMocks());

describe('todayForSchedule', () => {
  it('longe do evento: null sem criar Intl (a 1ª aba abre, como antes)', () => {
    const intl = vi.spyOn(Intl, 'DateTimeFormat');

    expect(todayForSchedule(DAYS, new Date('2026-10-12T15:00:00Z'), TZ)).toBeNull();
    expect(todayForSchedule(DAYS, new Date('2026-11-20T15:00:00Z'), TZ)).toBeNull();
    expect(intl).not.toHaveBeenCalled();
  });

  it('nos dias do evento: a data no fuso do evento', () => {
    expect(todayForSchedule(DAYS, new Date('2026-11-13T15:00:00Z'), TZ)).toBe('2026-11-13');
    // 01h UTC do dia 12 ainda é dia 11 em Araguaína (UTC-3)
    expect(todayForSchedule(DAYS, new Date('2026-11-12T01:00:00Z'), TZ)).toBe('2026-11-11');
  });

  it('nas bordas do fuso: 1º e último dia locais ainda casam', () => {
    // 22h do dia 14 em Araguaína = 01h UTC do dia 15
    expect(todayForSchedule(DAYS, new Date('2026-11-15T01:00:00Z'), TZ)).toBe('2026-11-14');
    // meia-noite do dia 11 em UTC+14 = 10h UTC do dia 10
    expect(todayForSchedule(DAYS, new Date('2026-11-10T10:00:00Z'), 'Pacific/Kiritimati')).toBe('2026-11-11');
  });

  it('sem datas válidas: null', () => {
    expect(todayForSchedule([], new Date('2026-11-13T15:00:00Z'), TZ)).toBeNull();
    expect(todayForSchedule(['', 'x'], new Date('2026-11-13T15:00:00Z'), TZ)).toBeNull();
  });
});

describe('scheduleDates', () => {
  it('lê o data-date das abas de cada programação', () => {
    document.body.innerHTML = `<div data-day-tabs>
      <button data-day-tab="d1" data-date="2026-11-11"></button>
      <button data-day-tab="d2" data-date="2026-11-12"></button>
    </div>`;
    const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-day-tabs]'));

    expect(scheduleDates(roots)).toEqual(['2026-11-11', '2026-11-12']);
  });
});
