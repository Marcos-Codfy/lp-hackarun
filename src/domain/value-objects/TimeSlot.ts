import { ValueObject } from '../shared/ValueObject';
import { DomainError } from '../shared/DomainError';

interface TimeSlotProps {
  start: string | null;
  end: string | null;
  startHint: string | null;
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

// faixa de horário de uma atividade; início pode ficar em aberto ("manhã até 15h")
export class TimeSlot extends ValueObject<TimeSlotProps> {
  static create(start: string | null, end: string | null, startHint: string | null = null): TimeSlot {
    for (const value of [start, end]) {
      if (value !== null && !HH_MM.test(value)) throw new DomainError(`Invalid time "${value}"`);
    }
    if (start && end && start >= end) throw new DomainError('TimeSlot start must be before end');
    if (!start && !end) throw new DomainError('TimeSlot needs at least start or end');
    return new TimeSlot({ start, end, startHint });
  }

  get start(): string | null {
    return this.props.start;
  }

  get end(): string | null {
    return this.props.end;
  }

  get startHint(): string | null {
    return this.props.startHint;
  }

  get hasOpenStart(): boolean {
    return this.props.start === null;
  }
}
