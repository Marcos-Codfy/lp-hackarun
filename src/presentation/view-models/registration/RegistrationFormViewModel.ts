import { Observable } from '@shared/core/Observable';
import type { RegistrationErrors } from '@domain/index';
import type { Clock, SubmitRegistration } from '@application/index';
import {
  emptyFields,
  toInput,
  withValue,
  type FieldPath,
  type RegistrationFields,
} from './RegistrationFields';
import {
  initialState,
  orderErrors,
  submittingState,
  type RegistrationFormState,
} from './RegistrationFormState';
import { FieldErrors } from './FieldErrors';
import { stepCompletion } from './registrationSteps';
import { SubmissionSession } from './SubmissionSession';

export type { FieldError, FormStatus, RegistrationFormState } from './RegistrationFormState';

export interface RegistrationFormDeps {
  submit: Pick<SubmitRegistration, 'validate' | 'execute' | 'currentStatus'>;
  // status do build (SSR): o estado inicial
  isOpen: boolean;
  clock: Clock;
  // testes fixam a chave de idempotência
  newKey?: () => string;
}

// o que volta do rascunho: os campos (o aceite nunca volta marcado) e a chave do envio
export interface RestoredDraft {
  fields: Partial<Record<FieldPath, string>>;
  sessionKey?: string | null;
}

// escolher uma opção já é a resposta: valida na hora, sem esperar o blur
const CHOICE_PATHS: ReadonlySet<FieldPath> = new Set(['profile', 'adult', 'area', 'period']);

export class RegistrationFormViewModel {
  readonly state: Observable<RegistrationFormState>;
  private readonly deps: RegistrationFormDeps;
  private seq = 0;
  private readonly session: SubmissionSession;
  private readonly errors: FieldErrors;

  constructor(deps: RegistrationFormDeps) {
    this.deps = deps;
    this.session = new SubmissionSession(deps.clock, deps.newKey);
    this.errors = new FieldErrors(deps.submit);
    this.state = new Observable(initialState(emptyFields(), deps.isOpen));
  }

  get isOpen(): boolean {
    return this.state.value.open;
  }

  get fields(): RegistrationFields {
    return this.state.value.fields;
  }

  setSource(source: string): void {
    this.session.setSource(source);
  }

  // chave do envio: vai pro rascunho e volta com ele (a resposta perdida não vira "e-mail já inscrito")
  get sessionKey(): string {
    return this.session.key;
  }

  // a página pode ter sido gerada antes do prazo: confere de novo no navegador. Só fecha, nunca reabre
  // (o dev simulado e o "em breve" dependem do build); envio em andamento ou feito não é interrompido
  refreshAvailability(liveTaken?: number): void {
    const { open, status } = this.state.value;
    if (!open || status === 'submitting' || status === 'success') return;
    if (this.deps.submit.currentStatus(liveTaken) !== 'closed') return;
    this.state.update((s) => ({ ...s, open: false, focus: null }));
  }

  setValue(path: FieldPath, value: string): void {
    if (CHOICE_PATHS.has(path)) this.errors.touch(path);
    this.patch(withValue(this.fields, path, value));
  }

  setAcceptedTerms(accepted: boolean): void {
    this.errors.touch('acceptedTerms');
    this.patch({ ...this.fields, acceptedTerms: accepted });
  }

  // rascunho da aba: volta o que foi digitado, com o aceite desmarcado, e a chave do envio (se a resposta se
  // perdeu, o reenvio é o mesmo envio)
  restore(draft: RestoredDraft): void {
    if (draft.sessionKey) this.session.resume(draft.sessionKey);
    const entries = Object.entries(draft.fields) as [FieldPath, string][];
    this.patch(entries.reduce((fields, [path, value]) => withValue(fields, path, value), emptyFields()));
  }

  // "Limpar rascunho": formulário do zero, sem erro à vista. Os conflitos do servidor ficam: o e-mail recusado
  // continua recusado se for digitado de novo. Com o envio em andamento não zera (false)
  reset(): boolean {
    if (this.state.value.status === 'submitting') return false;
    this.errors.forgetTouched();
    this.state.update((s) => ({
      ...initialState(emptyFields(), s.open),
      focus: { path: 'name', seq: ++this.seq, reason: 'move' },
    }));
    return true;
  }

  // valida o campo quando a pessoa sai dele
  blur(path: string): void {
    this.errors.touch(path);
    this.patch(this.fields);
  }

  async submit(): Promise<void> {
    const current = this.state.value;
    if (!current.open || current.status === 'submitting' || current.status === 'success') return;
    const errors = this.errors.all(current.fields);
    if (Object.keys(errors).length > 0) return this.showErrors(errors);

    this.state.update(submittingState);
    const result = await this.deps.submit.execute(
      toInput(current.fields),
      this.session.meta(current.fields.honeypot),
    );
    if (result.status === 'success') {
      this.session.complete();
      this.state.update((s) => ({
        ...s,
        status: 'success',
        protocol: result.protocol,
        needsGuardianConsent: current.fields.adult === 'no',
        focus: null,
      }));
    } else if (result.status === 'invalid') {
      this.showErrors(result.errors);
    } else if (result.status === 'conflict') {
      this.errors.recordConflicts(result.errors, current.fields);
      this.showErrors(this.errors.all(this.fields));
    } else {
      const { message, retryable } = result;
      this.state.update((s) => ({ ...s, status: 'error', failure: message, retryable }));
    }
  }

  // "Tentar de novo": mesmo envio, mesma chave (o servidor não duplica se o primeiro já tinha entrado)
  retry(): Promise<void> {
    return this.submit();
  }

  private showErrors(all: RegistrationErrors): void {
    const ordered = orderErrors(all);
    const first = ordered[0]?.path ?? null;
    this.state.update((s) => ({
      ...s,
      status: 'idle',
      attempted: true,
      errors: all,
      orderedErrors: ordered,
      steps: stepCompletion(this.errors.all(this.fields), this.fields),
      focus: first ? { path: first, seq: ++this.seq, reason: 'invalid' } : s.focus,
    }));
  }

  private patch(fields: RegistrationFields): void {
    const all = this.errors.all(fields);
    const errors = this.errors.visible(all, this.state.value.attempted);
    this.state.update((s) => ({
      ...s,
      fields,
      errors,
      orderedErrors: orderErrors(errors),
      steps: stepCompletion(all, fields),
    }));
  }
}
