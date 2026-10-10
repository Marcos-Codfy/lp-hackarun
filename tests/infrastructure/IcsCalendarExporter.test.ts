import { describe, expect, it } from 'vitest';
import { IcsCalendarExporter } from '@infrastructure/calendar/IcsCalendarExporter';

const entry = (overrides: Partial<{ title: string; description: string; location: string }> = {}) => ({
  uid: 'x@hackarun',
  title: 'Título',
  description: 'Descrição',
  location: 'Palmas',
  start: new Date('2026-11-11T22:00:00Z'),
  end: new Date('2026-11-12T01:00:00Z'),
  ...overrides,
});

const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

describe('IcsCalendarExporter', () => {
  const exporter = new IcsCalendarExporter();

  it('escapa vírgula, ponto e vírgula, barra e quebra de linha', () => {
    const ics = exporter.export('Cal', [entry({ title: 'A, B; C \\ D', description: 'linha 1\nlinha 2' })]);
    const lines = unfold(ics);
    expect(lines).toContain('SUMMARY:A\\, B\\; C \\\\ D');
    expect(lines).toContain('DESCRIPTION:linha 1\\nlinha 2');
  });

  it('dobra linhas longas em até 75 octetos sem quebrar caractere acentuado', () => {
    const description = 'Programação com acentuação e emoção '.repeat(8);
    const ics = exporter.export('Cal', [entry({ description })]);
    const encoder = new TextEncoder();
    const physical = ics.split('\r\n');
    physical.forEach((line) => expect(encoder.encode(line).length).toBeLessThanOrEqual(75));
    expect(physical.some((line) => line.startsWith(' '))).toBe(true);
    expect(unfold(ics)).toContain(`DESCRIPTION:${description}`);
    expect(ics).not.toContain('�');
  });

  it('datas em UTC no formato básico', () => {
    const lines = unfold(exporter.export('Cal', [entry()]));
    expect(lines).toContain('DTSTART:20261111T220000Z');
    expect(lines).toContain('DTEND:20261112T010000Z');
  });
});
