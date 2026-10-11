import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';
import { normalizeSearch } from '@shared/utils/text';

// mensagem em pt-BR porque vai direto pro usuário (igual aos campos de contato)
export class TeamName extends ValueObject<{ value: string }> {
  static readonly MIN = 2;
  static readonly MAX = 40;

  static create(raw: string): Result<TeamName, string> {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (value.length < TeamName.MIN || value.length > TeamName.MAX) {
      return fail(`O nome da equipe precisa ter de ${TeamName.MIN} a ${TeamName.MAX} caracteres.`);
    }
    return ok(new TeamName({ value }));
  }

  get value(): string {
    return this.props.value;
  }

  // usado na busca: ignora acento e caixa
  get searchKey(): string {
    return normalizeSearch(this.props.value);
  }
}
