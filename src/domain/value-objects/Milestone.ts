import { ValueObject } from '../shared/ValueObject';
import { assertValidDate } from '../shared/guards';

export type MilestoneKey = 'kickoff' | 'submission' | 'ceremony';

interface MilestoneProps {
  key: MilestoneKey;
  label: string;
  at: Date;
}

// marco do evento que o contador persegue
export class Milestone extends ValueObject<MilestoneProps> {
  static create(key: MilestoneKey, label: string, at: Date): Milestone {
    return new Milestone({ key, label, at: assertValidDate(at, `Milestone.${key}`) });
  }

  get key(): MilestoneKey {
    return this.props.key;
  }

  get label(): string {
    return this.props.label;
  }

  get at(): Date {
    return this.props.at;
  }

  isAfter(now: Date): boolean {
    return this.props.at.getTime() > now.getTime();
  }
}
