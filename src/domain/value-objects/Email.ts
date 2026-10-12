import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

// e-mail é o canal oficial do HackaRun: mensagens em pt-BR porque vão direto pro formulário.
// Mesmas regras do EMAIL_PATTERN/EMAIL_MAX do apps-script/Validation.gs (um teste confere)
export class Email extends ValueObject<{ value: string }> {
  static readonly MAX = 120;
  static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  static create(raw: string): Result<Email, string> {
    const value = raw.trim().toLowerCase();
    if (!value) return fail('Informe o e-mail.');
    if (value.length > Email.MAX || !Email.PATTERN.test(value)) {
      return fail('Confira o e-mail: algo como nome@exemplo.com.');
    }
    return ok(new Email({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
