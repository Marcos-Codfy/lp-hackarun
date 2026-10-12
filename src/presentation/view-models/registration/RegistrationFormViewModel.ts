import { Observable } from '@shared/core/Observable';
import type { RegistrationErrors, RegistrationMode } from '@domain/index';
import type { Clock, ImageFile, PreparedTeamImageDTO, SubmitRegistration } from '@application/index';
import {
  emptyFields,
  emptyMember,
  remapErrors,
  shiftMemberPath,
  toInput,
  withText,
  type RegistrationFields,
  type TextPath,
} from './RegistrationFields';
import { orderErrors, type RegistrationFormState, type TeamImageStatus } from './RegistrationFormState';
import { SubmissionSession } from './SubmissionSession';
import { TeamImageSlot, type TeamImagePreparer } from './TeamImageSlot';

export type { FieldError, FormStatus, RegistrationFormState, TeamImageStatus } from './RegistrationFormState';

export interface RegistrationFormDeps {
  submit: Pick<SubmitRegistration, 'validate' | 'execute' | 'currentStatus'>;
  // foto/logo da equipe: redimensiona e comprime no aparelho antes do envio
  prepareImage: TeamImagePreparer;
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
  private focusSeq = 0;
  private readonly session: SubmissionSession;
  private readonly image: TeamImageSlot;

  constructor(deps: RegistrationFormDeps) {
    this.deps = deps;
    // o líder conta como 1
    this.minRows = Math.max(0, deps.teamSize.min - 1);
    this.maxRows = Math.max(0, deps.teamSize.max - 1);
    this.nextKey = this.minRows;
    this.session = new SubmissionSession(deps.clock, deps.newKey);
    this.image = new TeamImageSlot(deps.prepareImage);
    const fields = emptyFields(this.minRows);
    this.state = new Observable<RegistrationFormState>({
      fields,
      errors: {},
      orderedErrors: [],
      status: 'idle',
      attempted: false,
      protocol: null,
      failure: null,
      retryable: false,
      open: deps.isOpen,
      focus: null,
      imageStatus: 'empty',
      ...this.bounds(fields),
    });
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

  setMode(mode: RegistrationMode): void {
    this.touched.add('mode');
    this.patch({ ...this.fields, mode });
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
  }

  removeMember(index: number): void {
    if (!this.state.value.canRemoveMember || !this.fields.members[index]) return;
    const members = this.fields.members.filter((_, i) => i !== index);
    this.touched = new Set([...this.touched].flatMap((p) => shiftMemberPath(p, index) ?? []));
    const target = members.length ? `members.${Math.min(index, members.length - 1)}.name` : 'members';
    this.patch({ ...this.fields, members }, target);
  }

  async submit(): Promise<void> {
    // clicou em enviar com a foto ainda preparando: espera ela, em vez de acusar "falta a foto".
    // Em loop: se a pessoa trocar de arquivo durante a espera, vale o novo, não o que estava no meio
    while (this.image.busy) await this.image.settled();
    const current = this.state.value;
    if (!current.open || current.status === 'submitting' || current.status === 'success') return;
    const { input, indexMap } = toInput(current.fields);
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
    const result = await this.deps.submit.execute(input, this.session.meta(current.fields.honeypot));
    if (result.status === 'success') {
      this.session.complete();
      this.state.update((s) => ({ ...s, status: 'success', protocol: result.protocol, focus: null }));
    } else if (result.status === 'invalid') {
      this.showErrors(remapErrors(result.errors, indexMap));
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
      focus: first ? { path: first, seq: ++this.focusSeq, reason: 'invalid' } : s.focus,
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
      ...(focusPath && { focus: { path: focusPath, seq: ++this.focusSeq, reason: 'move' as const } }),
    }));
  }

  private imageStatus(fields: RegistrationFields): TeamImageStatus {
    if (this.image.busy) return 'processing';
    if (fields.teamImage) return 'ready';
    return this.image.problem ? 'invalid' : 'empty';
  }

  // regras do domínio + o motivo do último arquivo recusado (mais útil que "falta a foto").
  // Foto preparando ainda não tem veredito: nada de "envie uma foto" com o spinner girando
  private allErrors(fields: RegistrationFields): RegistrationErrors {
    const { input, indexMap } = toInput(fields);
    const errors = remapErrors(this.deps.submit.validate(input), indexMap);
    if (this.image.busy) delete errors['teamImage'];
    else if (fields.mode === 'team' && !fields.teamImage && this.image.problem)
      errors['teamImage'] = this.image.problem;
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
    const team = fields.mode === 'team';
    return {
      canAddMember: team && fields.members.length < this.maxRows,
      canRemoveMember: team && fields.members.length > this.minRows,
    };
  }
}
