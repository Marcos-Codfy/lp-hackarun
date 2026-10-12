import { describe, expect, it } from 'vitest';
import eventData from '@infrastructure/content/event.json';
import type { RawEvent } from '@infrastructure/content/schema';
import { BuildCalendarInvite } from '@application/index';
import { StaticEventRepository } from '@infrastructure/repositories/StaticEventRepository';
import { IcsCalendarExporter } from '@infrastructure/calendar/IcsCalendarExporter';

const raw = eventData as RawEvent;
// um evento por bloco da programação: 5 blocos em 4 dias (o dia 14 tem dois); mudou o event.json, ajuste aqui
const SESSIONS = raw.days.reduce((acc, d) => acc + d.sessions.length, 0);

const build = (event: RawEvent = raw) =>
  new BuildCalendarInvite(new StaticEventRepository(event), new IcsCalendarExporter()).execute();

// desfaz o line folding da RFC 5545 pra ler as propriedades
const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

const blockOf = (lines: string[], uid: string) => {
  const start = lines.indexOf(`UID:${uid}@hackarun`);
  return lines.slice(start, start + 8);
};

describe('BuildCalendarInvite', () => {
  it('gera um VCALENDAR válido com os 5 blocos', async () => {
    expect(SESSIONS).toBe(5);
    const ics = await build();
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(SESSIONS);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(SESSIONS);
  });

  it('escreve todas as datas em UTC', async () => {
    const lines = unfold(await build());
    const dates = lines.filter((l) => /^(DTSTART|DTEND|DTSTAMP):/.test(l));
    expect(dates).toHaveLength(SESSIONS * 3);
    dates.forEach((l) => expect(l).toMatch(/^[A-Z]+:\d{8}T\d{6}Z$/));
    // 19h em Palmas (-03:00) = 22h UTC
    expect(lines).toContain('DTSTART:20261111T220000Z');
  });

  it('dia 14: desenvolvimento das 8h às 13h e a final sem hora de fim (3h depois do início)', async () => {
    const lines = unfold(await build());
    expect(blockOf(lines, 'final-development')).toEqual(
      expect.arrayContaining(['DTSTART:20261114T110000Z', 'DTEND:20261114T160000Z']),
    );
    expect(blockOf(lines, 'experience')).toEqual(
      expect.arrayContaining(['DTSTART:20261114T200000Z', 'DTEND:20261114T230000Z']),
    );
  });

  it('bloco sem início usa 3h antes do fim', async () => {
    const days = raw.days.map((d, i) =>
      i === 0 ? { ...d, sessions: d.sessions.map((s) => ({ ...s, start: null, activities: [] })) } : d,
    );
    const lines = unfold(await build({ ...raw, days }));
    expect(blockOf(lines, 'workshops-day-1')).toEqual(
      expect.arrayContaining(['DTSTART:20261111T215000Z', 'DTEND:20261112T005000Z']),
    );
  });

  it('local com o espaço do bloco e descrição com o roteiro', async () => {
    const lines = unfold(await build());
    const block = blockOf(lines, 'workshops-day-1');
    expect(block).toContain(
      'LOCATION:Centro Universitário Católica do Tocantins\\, Auditório do Bloco II\\, Palmas – TO',
    );
    const description = block.find((l) => l.startsWith('DESCRIPTION:')) ?? '';
    expect(description).toContain('19:00 · Ideia boa ou furada?');
    // quebra de linha escapada como \n (RFC 5545)
    expect(description).toContain('\\n21:00 · Hackeando ideias com IA');
    const opening = blockOf(lines, 'opening').find((l) => l.startsWith('DESCRIPTION:')) ?? '';
    expect(opening).toContain('19:00 · Exposição de Produtos e Soluções Tecnológicas (em paralelo)');
  });

  it('atividade opcional ganha "(opcional)" no roteiro, como no site', async () => {
    const lines = unfold(await build());
    const description = blockOf(lines, 'experience').find((l) => l.startsWith('DESCRIPTION:')) ?? '';
    expect(description).toContain('18:45 · Desfile e concurso de cosplay (opcional)');
    expect(description).not.toContain('Apresentação musical (opcional)');
  });

  it('bloco sem hora de fim avisa que o término do convite ainda não foi confirmado', async () => {
    const lines = unfold(await build());
    const description = (uid: string) => blockOf(lines, uid).find((l) => l.startsWith('DESCRIPTION:')) ?? '';
    expect(description('experience')).toContain('Horário de término a confirmar pela organização.');
    expect(description('final-development')).not.toContain('a confirmar');
  });

  it('nenhuma linha passa de 75 octetos', async () => {
    const encoder = new TextEncoder();
    (await build())
      .split('\r\n')
      .forEach((line) => expect(encoder.encode(line).length).toBeLessThanOrEqual(75));
  });
});
