import { Entity } from '../shared/Entity';
import { assertNonEmpty } from '../shared/guards';
import type { TimeSlot } from '../value-objects/TimeSlot';

export type SessionKind = 'workshop' | 'talk' | 'launch' | 'challenge' | 'deadline' | 'show' | 'ceremony';

export interface SessionProps {
  id: string;
  title: string;
  kind: SessionKind;
  slot: TimeSlot;
  venueId: string;
  description: string;
  topics: string[];
}

// atividade dentro de um dia do evento
export class Session extends Entity {
  readonly title: string;
  readonly kind: SessionKind;
  readonly slot: TimeSlot;
  readonly venueId: string;
  readonly description: string;
  readonly topics: readonly string[];

  private constructor(props: SessionProps) {
    super(props.id);
    this.title = assertNonEmpty(props.title, 'Session.title');
    this.kind = props.kind;
    this.slot = props.slot;
    this.venueId = props.venueId;
    this.description = props.description;
    this.topics = [...props.topics];
  }

  static create(props: SessionProps): Session {
    return new Session(props);
  }
}
