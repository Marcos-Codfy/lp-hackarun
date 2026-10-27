import { Observable } from '@shared/core/Observable';
import type { MentorErrors } from '@domain/index';
import type { Clock, SubmitMentorRegistration } from '@application/index';
import { SubmissionSession } from '../registration/SubmissionSession';
import {
  comparableValue,
  emptyFields,
  isFieldVisible,
  toInput,
  withDays,
  withFlag,
  withValue,
  type MentorFields,
  type MentorFlagPath,
  type MentorTextPath,
} from './MentorFields';
import { initialState, orderErrors, submittingState, type MentorFormState } from './MentorFormState';

export type { MentorFieldError, MentorFormState, MentorFormStatus } from './MentorFormState';

export interface MentorFormDeps {
  submit: Pick<SubmitMentorRegistration, 'validate' | 'execute'>;
  // status do build (SSR): o estado inicial
  isOpen: boolean;
  clock: Clock;
  // testes fixam a chave de idempotência
  newKey?: () => string;
}

// escolher uma opção já é a resposta: valida na hora, sem esperar o blur
const CHOICE_PATHS: ReadonlySet<string> = new Set([
  'area',
  'experience',
  'graduate',
  'days',
  'format',
  'mode',
]);

// e-mail ou WhatsApp que o servidor já tem: o erro fica no campo até a pessoa trocar o valor
class ServerConflicts {
  private readonly recorded = new Map<string, { value: string; message: string }>();

  record(errors: MentorErrors, fields: MentorFields): void {
    for (const [path, message] of Object.entries(errors)) {
      const value = comparableValue(fields, path);
      if (value) this.recorded.set(path, { value, message });
    }
  }

  active(fields: MentorFields): MentorErrors {
    const out: MentorErrors = {};
    for (const [path, { value, message }] of this.recorded) {
      if (comparableValue(fields, path) === value) out[path] = message;
    }
    return out;
  }
}

export class MentorFormViewModel {
  readonly state: Observable<MentorFormState>;
  private readonly deps: MentorFormDeps;
  private readonly session: SubmissionSession;
  private readonly conflicts = new ServerConflicts();
  private touched = new Set<string>();
  private seq = 0;

  constructor(deps: MentorFormDeps) {
    this.deps = deps;
    this.session = new SubmissionSession(deps.clock, deps.newKey);
    this.session.setSource('mentor-page');
    this.state = new Observable(initialState(emptyFields(), deps.isOpen));
  }

  get isOpen(): boolean {
    return this.state.value.open;
  }

  get fields(): MentorFields {
    return this.state.value.fields;
  }

  setSource(source: string): void {
    this.session.setSource(source);
  }

  setValue(path: MentorTextPath, value: string): void {
    if (CHOICE_PATHS.has(path)) this.touched.add(path);
    this.patch(withValue(this.fields, path, value));
  }

  // dias disponíveis: a lista inteira de quem está marcado
  setDays(days: readonly string[]): void {
    this.touched.add('days');
    this.patch(withDays(this.fields, days));
  }

  setFlag(path: MentorFlagPath, value: boolean): void {
    if (path === 'acceptedTerms') this.touched.add(path);
    this.patch(withFlag(this.fields, path, value));
  }

  // valida o campo quando a pessoa sai dele
  blur(path: string): void {
    this.touched.add(path);
    this.patch(this.fields);
  }

  async submit(): Promise<void> {
    const current = this.state.value;
    if (!current.open || current.status === 'submitting' || current.status === 'success') return;
    const errors = this.allErrors(current.fields);
    if (Object.keys(errors).length > 0) return this.showErrors(errors);

    this.state.update(submittingState);
    const result = await this.deps.submit.execute(
      toInput(current.fields),
      this.session.meta(current.fields.honeypot),
    );
    if (result.status === 'success') {
      this.session.complete();
      this.state.update((s) => ({ ...s, status: 'success', protocol: result.protocol, focus: null }));
    } else if (result.status === 'invalid') {
      this.showErrors(result.errors);
    } else if (result.status === 'conflict') {
      this.conflicts.record(result.errors, current.fields);
      this.showErrors(this.allErrors(this.fields));
    } else if (result.reason === 'closed') {
      // o servidor fechou o cadastro com a página aberta: o aviso de encerrado entra no lugar do formulário
      this.close();
    } else {
      const { message, retryable } = result;
      this.state.update((s) => ({ ...s, status: 'error', failure: message, retryable }));
    }
  }

  // "Tentar de novo": mesmo envio, mesma chave (o servidor não duplica se o primeiro já tinha entrado)
  retry(): Promise<void> {
    return this.submit();
  }

  // o servidor respondeu "encerrado" (ou o build já nasceu fechado): o formulário sai e o aviso entra
  close(): void {
    this.state.update((s) => ({ ...s, open: false, focus: null }));
  }

  // conflitos do servidor + regras do domínio (que ganham). Curso e ano de quem não é egresso não acusam erro
  private allErrors(fields: MentorFields): MentorErrors {
    const errors = { ...this.conflicts.active(fields), ...this.deps.submit.validate(toInput(fields)) };
    return Object.fromEntries(Object.entries(errors).filter(([path]) => isFieldVisible(fields, path)));
  }

  private visible(all: MentorErrors, attempted: boolean): MentorErrors {
    if (attempted) return all;
    return Object.fromEntries(Object.entries(all).filter(([path]) => this.touched.has(path)));
  }

  private showErrors(all: MentorErrors): void {
    const ordered = orderErrors(all);
    const first = ordered[0]?.path ?? null;
    this.state.update((s) => ({
      ...s,
      status: 'idle',
      attempted: true,
      errors: all,
      orderedErrors: ordered,
      focus: first ? { path: first, seq: ++this.seq, reason: 'invalid' } : s.focus,
    }));
  }

  private patch(fields: MentorFields): void {
    const errors = this.visible(this.allErrors(fields), this.state.value.attempted);
    this.state.update((s) => ({ ...s, fields, errors, orderedErrors: orderErrors(errors) }));
  }
}
