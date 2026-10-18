import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

export interface ShortTextRule {
  // rótulo na mensagem de erro ("o curso", "a instituição")
  label: string;
  min: number;
  max: number;
}

// texto curto digitado (curso, instituição): espaço sobrando sai e símbolo de código é recusado.
// Mesmas regras do cleanText_ do apps-script/Validation.gs (um teste confere)
export class ShortText extends ValueObject<{ value: string }> {
  static readonly FORBIDDEN = /[<>{}[\]\\|=^~`$]/;

  static normalize(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ');
  }

  static create(raw: string, rule: ShortTextRule): Result<ShortText, string> {
    const value = ShortText.normalize(raw);
    if (!value) return fail(`Informe ${rule.label}.`);
    if (value.length < rule.min) return fail(`Use pelo menos ${rule.min} caracteres.`);
    if (value.length > rule.max) return fail(`Use até ${rule.max} caracteres.`);
    if (ShortText.FORBIDDEN.test(value)) return fail('Use só letras, números e pontuação comum.');
    return ok(new ShortText({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
