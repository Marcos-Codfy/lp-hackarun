import { ValueObject } from '../shared/ValueObject';
import { DomainError } from '../shared/DomainError';
import { normalizeSearch } from '@shared/utils/text';

export class TeamName extends ValueObject<{ value: string }> {
  static readonly MIN = 2;
  static readonly MAX = 40;

  static create(raw: string): TeamName {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (value.length < TeamName.MIN || value.length > TeamName.MAX) {
      throw new DomainError(`Team name must have ${TeamName.MIN}-${TeamName.MAX} characters`);
    }
    return new TeamName({ value });
  }

  get value(): string {
    return this.props.value;
  }

  // usado na busca: ignora acento e caixa
  get searchKey(): string {
    return normalizeSearch(this.props.value);
  }
}
