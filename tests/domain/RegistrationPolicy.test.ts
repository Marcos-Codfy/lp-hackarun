import { describe, expect, it } from 'vitest';
import { RegistrationPolicy, RegistrationWindow, Slots } from '@domain/index';

const NOW = new Date('2026-11-01T12:00:00-03:00');
const HOUR = 60 * 60 * 1000;

const windowWith = (props: {
  endpoint?: string | null;
  closesAt?: Date | null;
  capacity?: number | null;
  taken?: number;
}) =>
  RegistrationWindow.create({
    endpoint: props.endpoint === undefined ? 'https://script.google.com/macros/s/x/exec' : props.endpoint,
    closesAt: props.closesAt ?? null,
    slots: Slots.create(props.capacity ?? null, props.taken ?? 0),
    teamSize: { min: 2, max: 5 },
  });

describe('RegistrationPolicy', () => {
  const policy = new RegistrationPolicy();

  it('sem endpoint = em breve', () => {
    expect(policy.statusAt(NOW, windowWith({ endpoint: null }))).toBe('soon');
    expect(policy.statusAt(NOW, windowWith({ endpoint: '   ' }))).toBe('soon');
  });

  it('com endpoint e sem prazo = aberta', () => {
    expect(policy.statusAt(NOW, windowWith({}))).toBe('open');
  });

  it('a 72h do fechamento entra em "últimas horas"', () => {
    const closesAt = new Date(NOW.getTime() + 48 * HOUR);
    expect(policy.statusAt(NOW, windowWith({ closesAt }))).toBe('closing');
    const far = new Date(NOW.getTime() + 100 * HOUR);
    expect(policy.statusAt(NOW, windowWith({ closesAt: far }))).toBe('open');
  });

  it('prazo vencido ou vagas esgotadas = encerrada', () => {
    expect(policy.statusAt(NOW, windowWith({ closesAt: new Date(NOW.getTime() - 1) }))).toBe('closed');
    // no instante exato do prazo já fecha, com ou sem endpoint
    expect(policy.statusAt(NOW, windowWith({ closesAt: NOW }))).toBe('closed');
    expect(policy.statusAt(NOW, windowWith({ endpoint: null, closesAt: NOW }))).toBe('closed');
    expect(policy.statusAt(NOW, windowWith({ capacity: 10, taken: 10 }))).toBe('closed');
    // esgotou ganha até de "sem endpoint"
    expect(policy.statusAt(NOW, windowWith({ endpoint: null, capacity: 5, taken: 5 }))).toBe('closed');
  });
});
