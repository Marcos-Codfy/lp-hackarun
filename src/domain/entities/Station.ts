import { Entity } from '../shared/Entity';
import { DomainError } from '../shared/DomainError';
import { assertNonEmpty } from '../shared/guards';

export type StationKind = 'qualifier' | 'final';

export interface StationProps {
  id: string;
  order: number;
  title: string;
  challenge: string;
  space: string;
  kind: StationKind;
  skills: string[];
}

// estação da corrida: cada uma é uma missão técnica
export class Station extends Entity {
  readonly order: number;
  readonly title: string;
  readonly challenge: string;
  readonly space: string;
  readonly kind: StationKind;
  readonly skills: readonly string[];

  private constructor(props: StationProps) {
    super(props.id);
    if (!Number.isInteger(props.order) || props.order < 1)
      throw new DomainError('Station.order must be >= 1');
    this.order = props.order;
    this.title = assertNonEmpty(props.title, 'Station.title');
    this.challenge = assertNonEmpty(props.challenge, 'Station.challenge');
    this.space = props.space;
    this.kind = props.kind;
    this.skills = [...props.skills];
  }

  static create(props: StationProps): Station {
    return new Station(props);
  }

  get code(): string {
    return String(this.order).padStart(2, '0');
  }

  get isFinal(): boolean {
    return this.kind === 'final';
  }
}
