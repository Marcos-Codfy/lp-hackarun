import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

// nome completo de quem compete: pelo menos duas palavras de 2+ letras (nome e sobrenome).
// Mesma regra do isFullName_ do apps-script/Validation.gs (um teste confere)
export class FullName extends ValueObject<{ value: string }> {
  static readonly MAX = 80;
  // número, @ ou símbolo de código no nome é quase sempre o campo errado
  private static readonly FORBIDDEN = /[0-9@<>{}[\]\\/|=+_#$%^&*~;:!?"()]/;

  static create(raw: string): Result<FullName, string> {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value) return fail('Informe o nome completo.');
    if (value.length > FullName.MAX) return fail(`Use até ${FullName.MAX} caracteres.`);
    if (FullName.FORBIDDEN.test(value)) return fail('Use só letras no nome.');
    const words = value.split(' ').filter((word) => word.replace(/[.'-]/g, '').length >= 2);
    if (words.length < 2) return fail('Escreva nome e sobrenome.');
    return ok(new FullName({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
