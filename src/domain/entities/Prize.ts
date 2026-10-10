import { Entity } from '../shared/Entity';

export interface PrizeProps {
  id: string;
  rank: number | null;
  title: string;
  description: string;
  reward: string | null;
}

// reward null = prêmio ainda não divulgado
export class Prize extends Entity {
  readonly rank: number | null;
  readonly title: string;
  readonly description: string;
  readonly reward: string | null;

  private constructor(props: PrizeProps) {
    super(props.id);
    this.rank = props.rank;
    this.title = props.title;
    this.description = props.description;
    this.reward = props.reward;
  }

  static create(props: PrizeProps): Prize {
    return new Prize(props);
  }

  get isRevealed(): boolean {
    return this.reward !== null;
  }
}
