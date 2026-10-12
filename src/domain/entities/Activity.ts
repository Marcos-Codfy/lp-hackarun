import { Entity } from '../shared/Entity';
import { DomainError } from '../shared/DomainError';
import { assertNonEmpty } from '../shared/guards';
import type { Audience } from '../value-objects/Audience';
import type { TimeSlot } from '../value-objects/TimeSlot';

export type ActivityKind = 'workshop' | 'talk' | 'expo' | 'hackathon' | 'show' | 'ceremony';

// em paralelo à programação principal · opcional · tema ainda a definir
export type ActivityFlag = 'parallel' | 'optional' | 'tbd';

const KINDS: readonly ActivityKind[] = ['workshop', 'talk', 'expo', 'hackathon', 'show', 'ceremony'];
const FLAGS: readonly ActivityFlag[] = ['parallel', 'optional', 'tbd'];

// horário avulso dentro da atividade ("Oficina 1: 19h às 19h50")
export interface ActivityPart {
  label: string;
  slot: TimeSlot;
}

export interface ActivityProps {
  id: string;
  title: string;
  kind: ActivityKind;
  slot: TimeSlot;
  // uma linha curta, sempre visível
  summary: string;
  // texto longo (miniementa), atrás de um "ver mais"
  details: string | null;
  // trilha diferente da do bloco (ex.: item do hackathon numa noite aberta)
  track: Audience | null;
  flags: ActivityFlag[];
  parts: ActivityPart[];
  checklist: string[];
}

// item da programação dentro de um bloco do dia
export class Activity extends Entity {
  readonly title: string;
  readonly kind: ActivityKind;
  readonly slot: TimeSlot;
  readonly summary: string;
  readonly details: string | null;
  readonly track: Audience | null;
  readonly flags: readonly ActivityFlag[];
  readonly parts: readonly ActivityPart[];
  readonly checklist: readonly string[];

  private constructor(props: ActivityProps) {
    super(props.id);
    if (!KINDS.includes(props.kind)) {
      throw new DomainError(`Activity ${props.id}: unknown kind "${props.kind}"`);
    }
    const badFlag = props.flags.find((f) => !FLAGS.includes(f));
    if (badFlag) throw new DomainError(`Activity ${props.id}: unknown flag "${badFlag}"`);
    const badPart = props.parts.find((p) => !props.slot.contains(p.slot));
    if (badPart) throw new DomainError(`Activity ${props.id}: "${badPart.label}" out of slot`);
    this.title = assertNonEmpty(props.title, 'Activity.title');
    this.kind = props.kind;
    this.slot = props.slot;
    this.summary = assertNonEmpty(props.summary, 'Activity.summary');
    this.details = props.details?.trim() || null;
    this.track = props.track;
    this.flags = [...new Set(props.flags)];
    this.parts = props.parts.map((p) => ({
      label: assertNonEmpty(p.label, 'ActivityPart.label'),
      slot: p.slot,
    }));
    this.checklist = props.checklist.map((item) => assertNonEmpty(item, 'Activity.checklist'));
  }

  static create(props: ActivityProps): Activity {
    return new Activity(props);
  }

  has(flag: ActivityFlag): boolean {
    return this.flags.includes(flag);
  }

  // "Oficinas 1, 2 e 3" acontecem três vezes: conta três oficinas
  get occurrences(): number {
    return Math.max(1, this.parts.length);
  }
}
