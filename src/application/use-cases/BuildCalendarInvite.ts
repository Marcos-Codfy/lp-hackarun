import type { EventRepository, Session } from '@domain/index';
import type { CalendarEntry, CalendarExporter } from '../ports/CalendarExporter';

// gera o .ics com todas as atividades; sessão sem início usa 3h antes do fim
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
          description: s.description,
          location: venue ? `${venue.name}, ${venue.city}` : event.city,
          start,
          end,
        };
      }),
    );

    return this.exporter.export(`${event.name} ${event.edition}`, entries);
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
