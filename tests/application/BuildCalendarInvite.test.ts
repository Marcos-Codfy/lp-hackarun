import { describe, expect, it } from 'vitest';
import eventData from '@infrastructure/content/event.json';
import type { RawEvent } from '@infrastructure/content/schema';
import { BuildCalendarInvite } from '@application/index';
import { StaticEventRepository } from '@infrastructure/repositories/StaticEventRepository';
import { IcsCalendarExporter } from '@infrastructure/calendar/IcsCalendarExporter';

const raw = eventData as RawEvent;
// conteúdo atual: 5 atividades em 4 dias (mudou o event.json, ajuste o número aqui)
const SESSIONS = raw.days.reduce((acc, d) => acc + d.sessions.length, 0);

const build = () =>
  new BuildCalendarInvite(new StaticEventRepository(raw), new IcsCalendarExporter()).execute();

// desfaz o line folding da RFC 5545 pra ler as propriedades
const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

describe('BuildCalendarInvite', () => {
  it('gera um VCALENDAR válido com as 5 atividades', async () => {
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

  it('sessão sem início usa 3h antes do fim; sem fim usa 3h depois do início', async () => {
    const lines = unfold(await build());
    const block = (uid: string) => {
      const start = lines.indexOf(`UID:${uid}@hackarun`);
      return lines.slice(start, start + 6);
    };
    expect(block('submission')).toEqual(
      expect.arrayContaining(['DTSTART:20261114T150000Z', 'DTEND:20261114T180000Z']),
    );
    expect(block('ceremony')).toEqual(
      expect.arrayContaining(['DTSTART:20261114T210000Z', 'DTEND:20261115T000000Z']),
    );
  });

  it('nenhuma linha passa de 75 octetos', async () => {
    const encoder = new TextEncoder();
    (await build())
      .split('\r\n')
      .forEach((line) => expect(encoder.encode(line).length).toBeLessThanOrEqual(75));
  });
});
