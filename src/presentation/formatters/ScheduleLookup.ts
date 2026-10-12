import type { ActivityDTO, EventDayDTO, SessionDTO } from '@application/index';
import { SessionTimeFormatter } from './SessionTimeFormatter';

export interface ActivityHit {
  day: EventDayDTO;
  session: SessionDTO;
  activity: ActivityDTO;
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

// as seções citam horários da programação (regulamento, premiação...) lendo do conteúdo, nunca repetindo à mão
export class ScheduleLookup {
  private readonly schedule: readonly EventDayDTO[];
  private readonly time = new SessionTimeFormatter();

  constructor(schedule: readonly EventDayDTO[]) {
    this.schedule = schedule;
  }

  activity(id: string): ActivityHit | null {
    for (const day of this.schedule) {
      for (const session of day.sessions) {
        const activity = session.activities.find((a) => a.id === id);
        if (activity) return { day, session, activity };
      }
    }
    return null;
  }

  // bloco que acontece no local da final (a HackaRun Experience)
  finalSession(): SessionDTO | null {
    return this.schedule.flatMap((d) => d.sessions).find((s) => s.venue.role === 'final') ?? null;
  }

  // "12/11"
  shortDate(day: EventDayDTO): string {
    return `${day.date.slice(8, 10)}/${day.date.slice(5, 7)}`;
  }

  // "12 de novembro"
  longDate(day: EventDayDTO): string {
    return `${Number(day.date.slice(8, 10))} de ${MONTHS[Number(day.date.slice(5, 7)) - 1] ?? ''}`;
  }

  // "19h35" (início da atividade)
  startOf(hit: ActivityHit): string {
    return hit.activity.start ? this.time.hour(hit.activity.start) : '';
  }
}
