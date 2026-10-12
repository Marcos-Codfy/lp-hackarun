import { Observable } from '@shared/core/Observable';
import type { RegistrationErrors } from '@domain/index';
import type { Clock, ImageFile, PreparedTeamImageDTO, SubmitRegistration } from '@application/index';
import {
  emptyFields,
  emptyMember,
  shiftMemberPath,
  toInput,
  withText,
  type RegistrationFields,
  type TextPath,
} from './RegistrationFields';
import {
  initialState,
  orderErrors,
  type RegistrationFormState,
  type TeamImageStatus,
} from './RegistrationFormState';
import { addedNotice, removedNotice } from './memberNotices';
import { ServerConflicts } from './ServerConflicts';
import { SubmissionSession } from './SubmissionSession';
import { TeamImageSlot, type TeamImagePreparer } from './TeamImageSlot';

export type { FieldError, FormStatus, RegistrationFormState, TeamImageStatus } from './RegistrationFormState';

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
  private touched = new Set<string>();
  private nextKey: number;
  private seq = 0;
  private readonly session: SubmissionSession;
  private readonly image: TeamImageSlot;
  private readonly conflicts = new ServerConflicts();

  constructor(deps: RegistrationFormDeps) {
    this.deps = deps;
    this.minRows = Math.max(1, deps.teamSize.min);
    this.maxRows = Math.max(this.minRows, deps.teamSize.max);
    this.nextKey = this.minRows;
    this.session = new SubmissionSession(deps.clock, deps.newKey);
    this.image = new TeamImageSlot(deps.prepareImage);
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
    this.touched.add('teamImage');
    const run = this.image.choose(file, (image) => this.patch({ ...this.fields, teamImage: image }));
    this.patch(this.fields);
    return run;
  }

  // imagem já preparada, sem passar pelo preparo: hoje só os testes usam (atalho pra montar um envio válido)
  setTeamImage(image: PreparedTeamImageDTO): void {
    this.image.accept();
    this.patch({ ...this.fields, teamImage: image });
  }

  setAcceptedTerms(accepted: boolean): void {
    this.touched.add('acceptedTerms');
    this.patch({ ...this.fields, acceptedTerms: accepted });
  }

  // valida o campo quando a pessoa sai dele
  blur(path: string): void {
    this.touched.add(path);
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
    this.touched = new Set([...this.touched].flatMap((p) => shiftMemberPath(p, index) ?? []));
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
    const errors = this.allErrors(current.fields);
    if (Object.keys(errors).length > 0) return this.showErrors(errors);

    this.state.update((s) => ({
      ...s,
      status: 'submitting',
      attempted: true,
      failure: null,
      retryable: false,
      errors: {},
      orderedErrors: [],
    }));
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
      // nome, e-mail ou matrícula já inscritos: o erro fica no campo até a pessoa trocar o valor
      this.conflicts.record(result.errors, current.fields);
      this.showErrors(this.allErrors(this.fields));
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
      focus: first ? { path: first, seq: ++this.seq, reason: 'invalid' } : s.focus,
    }));
  }

  private patch(fields: RegistrationFields, focusPath?: string): void {
    const errors = this.visibleErrors(fields);
    this.state.update((s) => ({
      ...s,
      fields,
      errors,
      orderedErrors: orderErrors(errors, fields),
      imageStatus: this.imageStatus(fields),
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

  // conflitos do servidor + regras do domínio (que ganham) + o motivo do último arquivo recusado.
  // Foto preparando ainda não tem veredito: nada de "envie uma foto" com o spinner girando
  private allErrors(fields: RegistrationFields): RegistrationErrors {
    const errors = { ...this.conflicts.active(fields), ...this.deps.submit.validate(toInput(fields)) };
    if (this.image.busy) delete errors['teamImage'];
    else if (!fields.teamImage && this.image.problem) errors['teamImage'] = this.image.problem;
    return errors;
  }

  // valida tudo (é barato) e mostra só o que já foi tocado
  private visibleErrors(fields: RegistrationFields): RegistrationErrors {
    const all = this.allErrors(fields);
    if (this.state.value.attempted) return all;
    const touchedMembers = [...this.touched].some((p) => p.startsWith('members.'));
    return Object.fromEntries(
      Object.entries(all).filter(
        ([path]) => this.touched.has(path) || (path === 'members' && touchedMembers),
      ),
    );
  }

  private bounds(fields: RegistrationFields): { canAddMember: boolean; canRemoveMember: boolean } {
    return {
      canAddMember: fields.members.length < this.maxRows,
      canRemoveMember: fields.members.length > this.minRows,
    };
  }
}
