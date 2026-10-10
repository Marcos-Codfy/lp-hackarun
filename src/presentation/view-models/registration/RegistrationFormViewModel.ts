import { Observable } from '@shared/core/Observable';
import type { RegistrationErrors, RegistrationMode } from '@domain/index';
import type { Clock, SubmitRegistration } from '@application/index';
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
import { orderErrors, type RegistrationFormState } from './RegistrationFormState';

export type { FieldError, FormStatus, RegistrationFormState } from './RegistrationFormState';

export interface RegistrationFormDeps {
  submit: Pick<SubmitRegistration, 'validate' | 'execute'>;
  teamSize: { min: number; max: number };
  isOpen: boolean;
  clock: Clock;
}

export class RegistrationFormViewModel {
  readonly state: Observable<RegistrationFormState>;
  private readonly deps: RegistrationFormDeps;
  private readonly minRows: number;
  private readonly maxRows: number;
  private touched = new Set<string>();
  private nextKey: number;
  private focusSeq = 0;
  private source = 'landing-page';
  private readonly createdAt: number;
  private startedAt: number | null = null;

  constructor(deps: RegistrationFormDeps) {
    this.deps = deps;
    // o líder conta como 1
    this.minRows = Math.max(0, deps.teamSize.min - 1);
    this.maxRows = Math.max(0, deps.teamSize.max - 1);
    this.nextKey = this.minRows;
    this.createdAt = deps.clock.now().getTime();
    const fields = emptyFields(this.minRows);
    this.state = new Observable<RegistrationFormState>({
      fields,
      errors: {},
      orderedErrors: [],
      status: 'idle',
      attempted: false,
      protocol: null,
      failure: null,
      focus: null,
      ...this.bounds(fields),
    });
  }

  get isOpen(): boolean {
    return this.deps.isOpen;
  }

  get fields(): RegistrationFields {
    return this.state.value.fields;
  }

  setSource(source: string): void {
    this.source = source;
  }

  setMode(mode: RegistrationMode): void {
    this.touched.add('mode');
    this.patch({ ...this.fields, mode });
  }

  setText(path: TextPath, value: string): void {
    this.patch(withText(this.fields, path, value));
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
    const current = this.state.value;
    if (!this.deps.isOpen || current.status === 'submitting' || current.status === 'success') return;
    const { input, indexMap } = toInput(current.fields);
    const errors = remapErrors(this.deps.submit.validate(input), indexMap);
    if (Object.keys(errors).length > 0) return this.showErrors(errors);

    this.state.update((s) => ({
      ...s,
      status: 'submitting',
      attempted: true,
      failure: null,
      errors: {},
      orderedErrors: [],
    }));
    const result = await this.deps.submit.execute(input, {
      honeypot: current.fields.honeypot,
      elapsedMs: this.deps.clock.now().getTime() - (this.startedAt ?? this.createdAt),
      source: this.source,
    });
    if (result.status === 'success') {
      this.state.update((s) => ({ ...s, status: 'success', protocol: result.protocol, focus: null }));
    } else if (result.status === 'invalid') {
      this.showErrors(remapErrors(result.errors, indexMap));
    } else {
      this.state.update((s) => ({ ...s, status: 'error', failure: result.message }));
    }
  }

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
    this.startedAt ??= this.deps.clock.now().getTime();
    const errors = this.visibleErrors(fields);
    this.state.update((s) => ({
      ...s,
      fields,
      errors,
      orderedErrors: orderErrors(errors, fields),
      ...this.bounds(fields),
      ...(focusPath && { focus: { path: focusPath, seq: ++this.focusSeq, reason: 'move' as const } }),
    }));
  }

  // valida tudo (é barato) e mostra só o que já foi tocado
  private visibleErrors(fields: RegistrationFields): RegistrationErrors {
    const { input, indexMap } = toInput(fields);
    const all = remapErrors(this.deps.submit.validate(input), indexMap);
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
