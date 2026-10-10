import { Entity } from '../shared/Entity';
import { DomainError } from '../shared/DomainError';
import type { Session } from './Session';

export type EventStage = 'training' | 'launch' | 'race' | 'final';

export interface EventDayProps {
  id: string;
  date: string;
  stage: EventStage;
  title: string;
  summary: string;
  sessions: Session[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class EventDay extends Entity {
  readonly date: string;
  readonly stage: EventStage;
  readonly title: string;
  readonly summary: string;
  readonly sessions: readonly Session[];

  private constructor(props: EventDayProps) {
    super(props.id);
    if (!ISO_DATE.test(props.date)) throw new DomainError(`Invalid day date "${props.date}"`);
    this.date = props.date;
    this.stage = props.stage;
    this.title = props.title;
    this.summary = props.summary;
    this.sessions = [...props.sessions];
  }

  static create(props: EventDayProps): EventDay {
    return new EventDay(props);
  }

  get venueIds(): string[] {
    return [...new Set(this.sessions.map((s) => s.venueId))];
  }
}
