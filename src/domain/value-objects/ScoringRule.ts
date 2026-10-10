import { ValueObject } from '../shared/ValueObject';
import { DomainError } from '../shared/DomainError';

export interface ScoringCriterion {
  key: string;
  label: string;
  points: number;
}

interface ScoringRuleProps {
  maxPoints: number;
  criteria: ScoringCriterion[];
}

// pontuação por estação: a soma dos critérios tem que bater com o máximo
export class ScoringRule extends ValueObject<ScoringRuleProps> {
  static create(maxPoints: number, criteria: ScoringCriterion[]): ScoringRule {
    const sum = criteria.reduce((acc, c) => acc + c.points, 0);
    if (sum !== maxPoints) throw new DomainError(`Scoring criteria sum (${sum}) must equal ${maxPoints}`);
    return new ScoringRule({ maxPoints, criteria: criteria.map((c) => ({ ...c })) });
  }

  get maxPoints(): number {
    return this.props.maxPoints;
  }

  get criteria(): readonly ScoringCriterion[] {
    return this.props.criteria;
  }

  shareOf(key: string): number {
    const criterion = this.props.criteria.find((c) => c.key === key);
    return criterion ? criterion.points / this.props.maxPoints : 0;
  }
}
