// programação: blocos do dia, atividades dentro do horário do bloco, público e oficinas contadas por horário
import { describe, expect, it } from 'vitest';
import {
  Activity,
  DomainError,
  EventDay,
  Session,
  TimeSlot,
  toAudience,
  type ActivityProps,
  type SessionProps,
} from '@domain/index';

const activity = (overrides: Partial<ActivityProps> = {}): Activity =>
  Activity.create({
    id: 'a',
    title: 'Oficina',
    kind: 'workshop',
    slot: TimeSlot.create('19:00', '19:50'),
    summary: 'Uma linha.',
    details: null,
    track: null,
    flags: [],
    parts: [],
    checklist: [],
    ...overrides,
  });

const session = (overrides: Partial<SessionProps> = {}): Session =>
  Session.create({
    id: 's',
    title: 'Bloco',
    kind: 'workshop',
    slot: TimeSlot.create('19:00', '22:00'),
    venueId: 'uni',
    place: 'Bloco II',
    audience: 'open',
    audienceNote: null,
    description: '',
    note: null,
    activities: [],
    ...overrides,
  });

describe('TimeSlot.contains', () => {
  const night = TimeSlot.create('19:00', '22:00');

  it('aceita faixa dentro e recusa a que vaza', () => {
    expect(night.contains(TimeSlot.create('19:00', '19:50'))).toBe(true);
    expect(night.contains(TimeSlot.create('21:00', '22:00'))).toBe(true);
    expect(night.contains(TimeSlot.create('18:30', '19:30'))).toBe(false);
    expect(night.contains(TimeSlot.create('21:30', '22:30'))).toBe(false);
    expect(night.contains(TimeSlot.create('22:00', null))).toBe(false);
  });

  it('ponta em aberto não limita ("a partir das 17h")', () => {
    const final = TimeSlot.create('17:00', null);
    expect(final.contains(TimeSlot.create('19:45', null))).toBe(true);
    expect(final.contains(TimeSlot.create('16:00', '17:30'))).toBe(false);
  });
});

describe('Activity', () => {
  it('conta cada horário avulso como uma ocorrência', () => {
    const parts = ['19:00', '20:00', '21:00'].map((start, i) => ({
      label: `Oficina ${i + 1}`,
      slot: TimeSlot.create(start, start.replace(':00', ':50')),
    }));
    const trio = activity({ slot: TimeSlot.create('19:00', '21:50'), parts });
    expect(trio.occurrences).toBe(3);
    expect(activity().occurrences).toBe(1);
  });

  it('recusa horário avulso fora da atividade, tipo e marca desconhecidos', () => {
    const late = [{ label: 'Oficina 4', slot: TimeSlot.create('22:00', '22:50') }];
    expect(() => activity({ slot: TimeSlot.create('19:00', '21:50'), parts: late })).toThrow(DomainError);
    expect(() => activity({ kind: 'party' as unknown as ActivityProps['kind'] })).toThrow(DomainError);
    expect(() => activity({ flags: ['secret' as unknown as ActivityProps['flags'][number]] })).toThrow(
      DomainError,
    );
  });

  it('limpa texto longo vazio e tira marca repetida', () => {
    const item = activity({ details: '   ', flags: ['parallel', 'parallel'] });
    expect(item.details).toBeNull();
    expect(item.flags).toEqual(['parallel']);
    expect(item.has('parallel')).toBe(true);
    expect(item.has('optional')).toBe(false);
  });
});

describe('Session', () => {
  it('ordena as atividades pelo início e conta as oficinas', () => {
    const expo = activity({
      id: 'expo',
      kind: 'expo',
      slot: TimeSlot.create('19:00', '21:30'),
      flags: ['parallel'],
    });
    const late = activity({ id: 'late', slot: TimeSlot.create('20:15', '21:00') });
    const early = activity({ id: 'early', slot: TimeSlot.create('19:00', '19:15'), kind: 'talk' });
    const block = session({ activities: [late, expo, early] });
    expect(block.activities.map((a) => a.id)).toEqual(['expo', 'early', 'late']);
    expect(block.workshopCount).toBe(1);
  });

  it('não deixa atividade fora do horário do bloco', () => {
    const outside = activity({ slot: TimeSlot.create('08:00', '13:00') });
    expect(() => session({ activities: [outside] })).toThrow(DomainError);
  });

  it('local e notas vazios viram null', () => {
    const block = session({ place: ' ', audienceNote: '', note: '  ' });
    expect([block.place, block.audienceNote, block.note]).toEqual([null, null, null]);
  });
});

describe('EventDay e público', () => {
  it('dia precisa de rótulo curto e de pelo menos um bloco', () => {
    const base = { id: 'd', date: '2026-11-11', stage: 'workshops' as const, title: 'Dia', summary: '' };
    expect(EventDay.create({ ...base, label: 'Oficinas', sessions: [session()] }).label).toBe('Oficinas');
    expect(() => EventDay.create({ ...base, label: ' ', sessions: [session()] })).toThrow(DomainError);
    expect(() => EventDay.create({ ...base, label: 'Oficinas', sessions: [] })).toThrow(DomainError);
  });

  it('público fora da lista quebra o build', () => {
    expect(toAudience('teams', 'x')).toBe('teams');
    expect(() => toAudience('vip', 'x')).toThrow(DomainError);
  });
});
