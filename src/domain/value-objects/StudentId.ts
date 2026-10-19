import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

// matrícula da UniCatólica (opcional, só pra quem estuda lá): sem espaço nas pontas e em maiúsculas.
// Mesmas regras do STUDENT_ID_PATTERN do apps-script/Validation.gs (um teste confere)
export class StudentId extends ValueObject<{ value: string }> {
  static readonly MIN = 4;
  static readonly MAX = 20;
  static readonly PATTERN = /^[A-Z0-9./-]+$/;

  static normalize(raw: string): string {
    return raw.trim().toUpperCase();
  }

  static create(raw: string): Result<StudentId, string> {
    const value = StudentId.normalize(raw);
    if (!value) return fail('Informe a matrícula.');
    if (value.length < StudentId.MIN || value.length > StudentId.MAX) {
      return fail(`A matrícula tem de ${StudentId.MIN} a ${StudentId.MAX} caracteres.`);
    }
    if (!StudentId.PATTERN.test(value)) return fail('Use só letras, números, ponto, hífen ou barra.');
    return ok(new StudentId({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
