import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

// WhatsApp com DDD, só número do Brasil: guarda "(63) 99999-9999". A chave pra achar repetido são os dígitos.
// Mesmas regras do normalizePhone_ do apps-script/Validation.gs (um teste confere)
export class Phone extends ValueObject<{ value: string; digits: string }> {
  // DDD de 11 a 99 (nenhum começa com 0 nem termina em 0)
  private static readonly DDD = /^[1-9][1-9]$/;

  // tira tudo que não é dígito, o 0 da frente ("063...") e o 55 do país (com ou sem +)
  static digitsOf(raw: string): string {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
    const withCountry = (digits.length === 12 || digits.length === 13) && digits.startsWith('55');
    return withCountry ? digits.slice(2) : digits;
  }

  static create(raw: string): Result<Phone, string> {
    if (!raw.trim()) return fail('Informe o WhatsApp com DDD.');
    const digits = Phone.digitsOf(raw);
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    // celular tem 9 dígitos e começa com 9; fixo (WhatsApp Business) tem 8 e começa de 2 a 5
    const mobile = number.length === 9 && number.startsWith('9');
    const landline = number.length === 8 && /^[2-5]/.test(number);
    if (!Phone.DDD.test(ddd) || !(mobile || landline)) {
      return fail('Confira o número: DDD + número, como (63) 99999-9999.');
    }
    const value = `(${ddd}) ${number.slice(0, -4)}-${number.slice(-4)}`;
    return ok(new Phone({ value, digits }));
  }

  get value(): string {
    return this.props.value;
  }

  get digits(): string {
    return this.props.digits;
  }
}
