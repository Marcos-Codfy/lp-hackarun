import type { RegistrationErrors } from '@domain/index';
import type { SubmitRegistration } from '@application/index';
import { isFieldPath, toInput, visibleFields, type RegistrationFields } from './RegistrationFields';
import { ServerConflicts } from './ServerConflicts';

// quais erros existem (regras do domínio + conflitos do servidor) e quais a pessoa já deveria ver (campo
// tocado ou envio tentado)
export class FieldErrors {
  private touched = new Set<string>();
  private readonly conflicts = new ServerConflicts();
  private readonly submit: Pick<SubmitRegistration, 'validate'>;

  constructor(submit: Pick<SubmitRegistration, 'validate'>) {
    this.submit = submit;
  }

  touch(path: string): void {
    this.touched.add(path);
  }

  // formulário limpo: nada tocado. Os conflitos ficam (o valor recusado continua recusado)
  forgetTouched(): void {
    this.touched = new Set();
  }

  // e-mail, WhatsApp ou matrícula já inscritos: o erro fica no campo até a pessoa trocar o valor
  recordConflicts(errors: RegistrationErrors, fields: RegistrationFields): void {
    this.conflicts.record(errors, fields);
  }

  // conflitos do servidor + regras do domínio (que ganham). Campo escondido pelo perfil não acusa erro
  all(fields: RegistrationFields): RegistrationErrors {
    const errors = { ...this.conflicts.active(fields), ...this.submit.validate(toInput(fields)) };
    const visible = visibleFields(fields.profile);
    return Object.fromEntries(
      Object.entries(errors).filter(([path]) => !isFieldPath(path) || visible.has(path)),
    );
  }

  // valida tudo (é barato) e mostra só o que já foi tocado
  visible(all: RegistrationErrors, attempted: boolean): RegistrationErrors {
    if (attempted) return all;
    return Object.fromEntries(Object.entries(all).filter(([path]) => this.touched.has(path)));
  }
}
