import { Observable } from '@shared/core/Observable';
import type { RegistrationErrors } from '@domain/index';
import type { Clock, ImageFile, PreparedTeamImageDTO, SubmitRegistration } from '@application/index';
import {
  emptyFields,
  emptyMember,
  fieldsFromDraft,
  toInput,
  withText,
  type RegistrationFields,
  type RestoredFields,
  type TextPath,
} from './RegistrationFields';
import {
  initialState,
  orderErrors,
  submittingState,
  type RegistrationFormState,
  type TeamImageStatus,
} from './RegistrationFormState';
import { FieldErrors } from './FieldErrors';
import { addedNotice, removedNotice } from './memberNotices';
import { stepCompletion } from './registrationSteps';
import { SubmissionSession } from './SubmissionSession';
import { TeamImageSlot, type TeamImagePreparer } from './TeamImageSlot';

export type { FieldError, FormStatus, RegistrationFormState, TeamImageStatus } from './RegistrationFormState';
export type { RestoredFields } from './RegistrationFields';

export interface RegistrationFormDeps {
  submit: Pick<SubmitRegistration, 'validate' | 'execute' | 'currentStatus'>;
  // foto/logo da equipe: redimensiona e comprime no aparelho antes do envio
  prepareImage: TeamImagePreparer;
  // contando todo mundo: o integrante 1 (contato) também
  teamSize: { min: number; max: number };
  // status do build (SSR): o estado inicial
  isOpen: boolean;
  clock: Clock;
  // testes fixam a chave de idempotência
  newKey?: () => string;
}

export class RegistrationFormViewModel {
  readonly state: Observable<RegistrationFormState>;
  private readonly deps: RegistrationFormDeps;
  private readonly minRows: number;
  private readonly maxRows: number;
  private nextKey: number;
  private seq = 0;
  private readonly session: SubmissionSession;
  private readonly image: TeamImageSlot;
  private readonly errors: FieldErrors;

  constructor(deps: RegistrationFormDeps) {
    this.deps = deps;
    this.minRows = Math.max(1, deps.teamSize.min);
    this.maxRows = Math.max(this.minRows, deps.teamSize.max);
    this.nextKey = this.minRows;
    this.session = new SubmissionSession(deps.clock, deps.newKey);
    this.image = new TeamImageSlot(deps.prepareImage);
    this.errors = new FieldErrors(deps.submit, this.image);
    const fields = emptyFields(this.minRows);
    this.state = new Observable(initialState(fields, deps.isOpen, this.bounds(fields)));
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

  // chave do envio: vai pro rascunho e volta com ele (a resposta perdida não vira "nome já inscrito")
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

  setText(path: TextPath, value: string): void {
    this.patch(withText(this.fields, path, value));
  }

  // arquivo escolhido: prepara no aparelho; recusado (tipo, peso, resolução) vira o erro do campo
  chooseTeamImage(file: ImageFile): Promise<void> {
    this.errors.touch('teamImage');
    const run = this.image.choose(file, (image) => this.patch({ ...this.fields, teamImage: image }));
    this.patch(this.fields);
    return run;
  }

  // imagem já preparada, sem passar pelo preparo (rascunho recuperado e testes)
  setTeamImage(image: PreparedTeamImageDTO): void {
    this.image.accept();
    this.patch({ ...this.fields, teamImage: image });
  }

  // rascunho da aba: volta o que foi digitado, dentro do tamanho da equipe, com o aceite desmarcado, e a chave
  // do envio (se a resposta se perdeu, o reenvio é o mesmo envio)
  restore(draft: RestoredFields & { sessionKey?: string | null }): void {
    if (draft.sessionKey) this.session.resume(draft.sessionKey);
    const fields = fieldsFromDraft(draft, this.minRows, this.maxRows);
    this.nextKey = Math.max(this.nextKey, fields.members.length);
    if (fields.teamImage) this.image.accept();
    this.patch(fields);
  }

  // "Limpar rascunho": formulário do zero, sem erro à vista. Os conflitos do servidor ficam: o nome ou o
  // e-mail recusado continua recusado se for digitado de novo. Com o envio em andamento não zera (false)
  reset(): boolean {
    if (this.state.value.status === 'submitting') return false;
    this.image.accept();
    this.errors.forgetTouched();
    const fields = emptyFields(this.minRows);
    this.state.update((s) => ({
      ...initialState(fields, s.open, this.bounds(fields)),
      focus: { path: 'teamName', seq: ++this.seq, reason: 'move' },
    }));
    return true;
  }

  setAcceptedTerms(accepted: boolean): void {
    this.errors.touch('acceptedTerms');
    this.patch({ ...this.fields, acceptedTerms: accepted });
  }

  // valida o campo quando a pessoa sai dele
  blur(path: string): void {
    this.errors.touch(path);
    this.patch(this.fields);
  }

  addMember(): void {
    if (!this.state.value.canAddMember) return;
    const members = [...this.fields.members, emptyMember(this.nextKey++)];
    this.patch({ ...this.fields, members }, `members.${members.length - 1}.name`);
    this.announce(addedNotice(members.length, this.maxRows));
  }

  // o contato (linha 0) nunca sai; o foco vai pra linha que subiu ou, se era a última, pro "Adicionar"
  removeMember(index: number): void {
    if (index < 1 || !this.state.value.canRemoveMember || !this.fields.members[index]) return;
    const members = this.fields.members.filter((_, i) => i !== index);
    this.errors.memberRemoved(index);
    const target = members[index] ? `members.${index}.name` : 'members.add';
    this.patch({ ...this.fields, members }, target);
    this.announce(removedNotice(index + 1, members.length, this.maxRows));
  }

  async submit(): Promise<void> {
    // clicou em enviar com a foto ainda preparando: espera ela, em vez de acusar "falta a foto".
    // Em loop: se a pessoa trocar de arquivo durante a espera, vale o novo, não o que estava no meio
    while (this.image.busy) await this.image.settled();
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
      this.state.update((s) => ({ ...s, status: 'success', protocol: result.protocol, focus: null }));
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
    const ordered = orderErrors(all, this.fields);
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

  private patch(fields: RegistrationFields, focusPath?: string): void {
    const all = this.errors.all(fields);
    const errors = this.errors.visible(all, this.state.value.attempted);
    this.state.update((s) => ({
      ...s,
      fields,
      errors,
      orderedErrors: orderErrors(errors, fields),
      imageStatus: this.imageStatus(fields),
      steps: stepCompletion(all, fields),
      ...this.bounds(fields),
      ...(focusPath && { focus: { path: focusPath, seq: ++this.seq, reason: 'move' as const } }),
    }));
  }

  private announce(text: string): void {
    this.state.update((s) => ({ ...s, announcement: { text, seq: ++this.seq } }));
  }

  private imageStatus(fields: RegistrationFields): TeamImageStatus {
    if (this.image.busy) return 'processing';
    if (fields.teamImage) return 'ready';
    return this.image.problem ? 'invalid' : 'empty';
  }

  private bounds(fields: RegistrationFields): { canAddMember: boolean; canRemoveMember: boolean } {
    return {
      canAddMember: fields.members.length < this.maxRows,
      canRemoveMember: fields.members.length > this.minRows,
    };
  }
}
