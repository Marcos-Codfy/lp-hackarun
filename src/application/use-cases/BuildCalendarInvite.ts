import type { EventRepository, Session } from '@domain/index';
import type { CalendarEntry, CalendarExporter } from '../ports/CalendarExporter';

export const UNCONFIRMED_END = 'Horário de término a confirmar pela organização.';

// gera o .ics com um evento por bloco da programação; sessão sem início usa 3h antes do fim (sem fim, 3h depois)
export class BuildCalendarInvite {
  private readonly events: EventRepository;
  private readonly exporter: CalendarExporter;

  constructor(events: EventRepository, exporter: CalendarExporter) {
    this.events = events;
    this.exporter = exporter;
  }

  async execute(): Promise<string> {
    const event = await this.events.get();
    const offset = event.timezone === 'America/Araguaina' ? '-03:00' : 'Z';

    const entries: CalendarEntry[] = event.days.flatMap((day) =>
      day.sessions.map((s) => {
        const venue = event.venue(s.venueId);
        const { start, end } = this.resolveTimes(day.date, s, offset);
        return {
          uid: `${s.id}@hackarun`,
          title: `${event.name} · ${s.title}`,
          description: this.describe(s),
          location: venue ? [venue.name, s.place, venue.city].filter(Boolean).join(', ') : event.city,
          start,
          end,
        };
      }),
    );

    return this.exporter.export(`${event.name} ${event.edition}`, entries);
  }

  // resumo do bloco + roteiro ("19:00 · Ideia boa ou furada?"), um item por linha. Bloco sem hora de fim
  // no documento: o fim do convite é estimado e a descrição avisa
  private describe(s: Session): string {
    const lines = s.activities.map((a) => {
      const marks = `${a.has('parallel') ? ' (em paralelo)' : ''}${a.has('optional') ? ' (opcional)' : ''}`;
      return `${a.slot.start ?? a.slot.end ?? ''} · ${a.title}${marks}`;
    });
    const pending = s.slot.end ? null : UNCONFIRMED_END;
    return [s.description, ...lines, pending].filter(Boolean).join('\n');
  }

  private resolveTimes(date: string, s: Session, offset: string): { start: Date; end: Date } {
    const at = (time: string) => new Date(`${date}T${time}:00${offset}`);
    const HOUR = 60 * 60 * 1000;
    if (s.slot.start && s.slot.end) return { start: at(s.slot.start), end: at(s.slot.end) };
    if (s.slot.end) return { start: new Date(at(s.slot.end).getTime() - 3 * HOUR), end: at(s.slot.end) };
    const start = at(s.slot.start as string);
    return { start, end: new Date(start.getTime() + 3 * HOUR) };
  }
}
