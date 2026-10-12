import { Entity } from '../shared/Entity';
import { DomainError } from '../shared/DomainError';
import { assertNonEmpty } from '../shared/guards';
import type { Audience } from '../value-objects/Audience';
import type { TimeSlot } from '../value-objects/TimeSlot';
import type { Activity } from './Activity';

export type SessionKind = 'workshop' | 'talk' | 'launch' | 'challenge' | 'deadline' | 'show' | 'ceremony';

export interface SessionProps {
  id: string;
  title: string;
  kind: SessionKind;
  slot: TimeSlot;
  venueId: string;
  // onde dentro do local ("Auditório do Bloco II"); null = o local inteiro
  place: string | null;
  audience: Audience;
  // quem é o público, do jeito que a organização escreveu
  audienceNote: string | null;
  description: string;
  // aviso curto no fim do bloco (encerramento, prazo)
  note: string | null;
  activities: Activity[];
}

// bloco contínuo de um dia (mesmo local e mesmo público), com as atividades em ordem
export class Session extends Entity {
  readonly title: string;
  readonly kind: SessionKind;
  readonly slot: TimeSlot;
  readonly venueId: string;
  readonly place: string | null;
  readonly audience: Audience;
  readonly audienceNote: string | null;
  readonly description: string;
  readonly note: string | null;
  readonly activities: readonly Activity[];

  private constructor(props: SessionProps) {
    super(props.id);
    const outside = props.activities.find((a) => !props.slot.contains(a.slot));
    if (outside) throw new DomainError(`Session ${props.id}: "${outside.title}" is out of the session slot`);
    this.title = assertNonEmpty(props.title, 'Session.title');
    this.kind = props.kind;
    this.slot = props.slot;
    this.venueId = props.venueId;
    this.place = props.place?.trim() || null;
    this.audience = props.audience;
    this.audienceNote = props.audienceNote?.trim() || null;
    this.description = props.description;
    this.note = props.note?.trim() || null;
    // por início; atividade sem início (só fim) vai pro começo, empate mantém a ordem do conteúdo
    this.activities = [...props.activities].sort((a, b) =>
      (a.slot.start ?? '').localeCompare(b.slot.start ?? ''),
    );
  }

  static create(props: SessionProps): Session {
    return new Session(props);
  }

  // oficinas do bloco, contando cada horário avulso
  get workshopCount(): number {
    return this.activities.filter((a) => a.kind === 'workshop').reduce((acc, a) => acc + a.occurrences, 0);
  }
}
