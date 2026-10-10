import { ValueObject } from '../shared/ValueObject';
import { DomainError } from '../shared/DomainError';

export type SlotsLevel = 'unknown' | 'plenty' | 'filling' | 'last' | 'full';

interface SlotsProps {
  capacity: number | null;
  taken: number;
}

// vagas de equipes; capacidade null = organização ainda não definiu
export class Slots extends ValueObject<SlotsProps> {
  static create(capacity: number | null, taken: number): Slots {
    if (taken < 0) throw new DomainError('Taken slots cannot be negative');
    if (capacity !== null && capacity <= 0) throw new DomainError('Capacity must be positive');
    return new Slots({ capacity, taken });
  }

  get capacity(): number | null {
    return this.props.capacity;
  }

  get taken(): number {
    return this.props.taken;
  }

  get remaining(): number | null {
    if (this.props.capacity === null) return null;
    return Math.max(0, this.props.capacity - this.props.taken);
  }

  get fillRatio(): number | null {
    if (this.props.capacity === null) return null;
    return Math.min(1, this.props.taken / this.props.capacity);
  }

  get level(): SlotsLevel {
    const ratio = this.fillRatio;
    if (ratio === null) return 'unknown';
    if (ratio >= 1) return 'full';
    if (ratio >= 0.85) return 'last';
    if (ratio >= 0.5) return 'filling';
    return 'plenty';
  }
}
