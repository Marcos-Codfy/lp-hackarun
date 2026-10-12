import type { RegistrationErrors } from '@domain/index';
import type { SubmitRegistration } from '@application/index';
import { shiftMemberPath, toInput, type RegistrationFields } from './RegistrationFields';
import { ServerConflicts } from './ServerConflicts';
import type { TeamImageSlot } from './TeamImageSlot';

// quais erros existem (regras do domínio + conflitos do servidor + foto recusada) e quais a pessoa já
// deveria ver (campo tocado ou envio tentado)
export class FieldErrors {
  private touched = new Set<string>();
  private readonly conflicts = new ServerConflicts();
  private readonly submit: Pick<SubmitRegistration, 'validate'>;
  private readonly image: TeamImageSlot;

  constructor(submit: Pick<SubmitRegistration, 'validate'>, image: TeamImageSlot) {
    this.submit = submit;
    this.image = image;
  }

  touch(path: string): void {
    this.touched.add(path);
  }

  // remover a linha i desloca os campos tocados das linhas de baixo
  memberRemoved(index: number): void {
    this.touched = new Set([...this.touched].flatMap((p) => shiftMemberPath(p, index) ?? []));
  }

  // formulário limpo: nada tocado. Os conflitos ficam (o valor recusado continua recusado)
  forgetTouched(): void {
    this.touched = new Set();
  }

  // nome, e-mail ou matrícula já inscritos: o erro fica no campo até a pessoa trocar o valor
  recordConflicts(errors: RegistrationErrors, fields: RegistrationFields): void {
    this.conflicts.record(errors, fields);
  }

  // conflitos do servidor + regras do domínio (que ganham) + o motivo do último arquivo recusado.
  // Foto preparando ainda não tem veredito: nada de "envie uma foto" com o spinner girando
  all(fields: RegistrationFields): RegistrationErrors {
    const errors = { ...this.conflicts.active(fields), ...this.submit.validate(toInput(fields)) };
    if (this.image.busy) delete errors['teamImage'];
    else if (!fields.teamImage && this.image.problem) errors['teamImage'] = this.image.problem;
    return errors;
  }

  // valida tudo (é barato) e mostra só o que já foi tocado
  visible(all: RegistrationErrors, attempted: boolean): RegistrationErrors {
    if (attempted) return all;
    const touchedMembers = [...this.touched].some((p) => p.startsWith('members.'));
    return Object.fromEntries(
      Object.entries(all).filter(
        ([path]) => this.touched.has(path) || (path === 'members' && touchedMembers),
      ),
    );
  }
}
