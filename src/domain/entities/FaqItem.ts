import { Entity } from '../shared/Entity';
import { assertNonEmpty } from '../shared/guards';

export interface FaqItemProps {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export class FaqItem extends Entity {
  readonly question: string;
  readonly answer: string;
  readonly category: string;

  private constructor(props: FaqItemProps) {
    super(props.id);
    this.question = assertNonEmpty(props.question, 'FaqItem.question');
    this.answer = assertNonEmpty(props.answer, 'FaqItem.answer');
    this.category = props.category;
  }

  static create(props: FaqItemProps): FaqItem {
    return new FaqItem(props);
  }
}
