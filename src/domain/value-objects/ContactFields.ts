import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

// mensagens já em pt-BR porque vão direto pro usuário
export class Email extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  static create(raw: string): Result<Email, string> {
    const value = raw.trim().toLowerCase();
    if (!value) return fail('Informe o e-mail.');
    if (value.length > 120 || !Email.PATTERN.test(value)) return fail('E-mail inválido.');
    return ok(new Email({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}

export class PersonName extends ValueObject<{ value: string }> {
  static create(raw: string): Result<PersonName, string> {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value) return fail('Informe o nome completo.');
    if (value.length < 5 || !value.includes(' ')) return fail('Use nome e sobrenome.');
    if (value.length > 80) return fail('Nome muito longo.');
    return ok(new PersonName({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}

// celular BR com DDD; guarda só os dígitos
export class Phone extends ValueObject<{ digits: string }> {
  static create(raw: string): Result<Phone, string> {
    const digits = raw.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (!digits) return fail('Informe o WhatsApp.');
    if (!/^[1-9]{2}9?\d{8}$/.test(digits)) return fail('WhatsApp inválido. Use DDD + número.');
    return ok(new Phone({ digits }));
  }

  get digits(): string {
    return this.props.digits;
  }

  get formatted(): string {
    const d = this.props.digits;
    return d.length === 11
      ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
}
