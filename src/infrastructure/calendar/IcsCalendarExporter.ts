import type { CalendarEntry, CalendarExporter } from '@application/index';

// RFC 5545 enxuto: o suficiente pra Google, Apple e Outlook importarem
export class IcsCalendarExporter implements CalendarExporter {
  export(calendarName: string, entries: CalendarEntry[]): string {
    const stamp = IcsCalendarExporter.toUtc(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HackaRun//Landing Page//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${IcsCalendarExporter.escape(calendarName)}`,
      ...entries.flatMap((e) => [
        'BEGIN:VEVENT',
        `UID:${e.uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${IcsCalendarExporter.toUtc(e.start)}`,
        `DTEND:${IcsCalendarExporter.toUtc(e.end)}`,
        `SUMMARY:${IcsCalendarExporter.escape(e.title)}`,
        `DESCRIPTION:${IcsCalendarExporter.escape(e.description)}`,
        `LOCATION:${IcsCalendarExporter.escape(e.location)}`,
        'END:VEVENT',
      ]),
      'END:VCALENDAR',
    ];
    return lines.map(IcsCalendarExporter.fold).join('\r\n') + '\r\n';
  }

  private static toUtc(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  private static escape(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  // linhas > 75 octetos quebram com espaço na frente (spec)
  private static fold(line: string): string {
    const bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;
    const parts: string[] = [];
    let current = '';
    for (const char of line) {
      if (new TextEncoder().encode(current + char).length > (parts.length ? 74 : 75)) {
        parts.push(current);
        current = char;
      } else {
        current += char;
      }
    }
    parts.push(current);
    return parts.join('\r\n ');
  }
}
