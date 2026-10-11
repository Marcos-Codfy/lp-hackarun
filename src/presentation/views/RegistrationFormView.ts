import type { RegistrationMode } from '@domain/index';
import type { EventBus } from '@shared/core/EventBus';
import { qs, qsa } from '@shared/utils/dom';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { TextPath } from '@presentation/view-models/registration/RegistrationFields';
import type {
  RegistrationFormState,
  RegistrationFormViewModel,
} from '@presentation/view-models/registration/RegistrationFormViewModel';
import { ClosedLobby } from './registration/ClosedLobby';
import { ErrorPresenter } from './registration/ErrorPresenter';
import { MemberRows } from './registration/MemberRows';
import { SubmitStatusPresenter } from './registration/SubmitStatusPresenter';
import { controlFor } from './registration/fieldLookup';

// [data-registration-form]: liga o DOM ao VM; valores moram nos inputs, o VM só espelha
export class RegistrationFormView {
  private readonly root: HTMLElement;
  private readonly vm: RegistrationFormViewModel;
  private readonly errors: ErrorPresenter;
  private readonly status: SubmitStatusPresenter;
  private readonly lobby: ClosedLobby;
  private rows: MemberRows | null = null;
  private lastFocusSeq = 0;

  constructor(root: HTMLElement, vm: RegistrationFormViewModel, bus: EventBus<AppEvents>) {
    this.root = root;
    this.vm = vm;
    this.errors = new ErrorPresenter(root);
    this.status = new SubmitStatusPresenter(root, bus);
    this.lobby = new ClosedLobby(root);
  }

  mount(): void {
    const form = qs<HTMLFormElement>('[data-reg-form]', this.root);
    // o build já fechou (ou ainda não abriu): o HTML estático basta
    if (!form || !this.vm.isOpen) return;
    this.vm.refreshAvailability();
    const list = qs('[data-members-list]', this.root);
    const template = qs<HTMLTemplateElement>('template[data-member-template]', this.root);
    if (list && template) {
      this.rows = new MemberRows(list, template, {
        input: (i, field, value) => this.vm.setText(`members.${i}.${field}`, value),
        blur: (i, field) => this.vm.blur(`members.${i}.${field}`),
        remove: (i) => this.vm.removeMember(i),
      });
    }
    this.bindForm(form);
    this.restoreFromDom(form);
    this.vm.state.subscribe((state, prev) => this.render(state, prev === state ? null : prev));
  }

  // foco de quem chega por um CTA; só foca se o alvo já estiver na tela (senão o foco "some")
  focusEntry(): boolean {
    const status = this.vm.state.value.status;
    const target =
      status === 'success'
        ? qs('[data-reg-success-title]', this.root)
        : this.vm.isOpen
          ? controlFor(this.root, 'mode')
          : (qs('[data-reg-notice-title]', this.root) ?? qs('[data-reg-form]', this.root));
    if (!target) return false;
    const rect = target.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
    target.focus({ preventScroll: true });
    return true;
  }

  private bindForm(form: HTMLFormElement): void {
    form.addEventListener('input', (e) => {
      const el = e.target;
      const isControl =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement;
      if (!isControl) return;
      const path = el.dataset['field'];
      if (!path) return;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') this.vm.setAcceptedTerms(el.checked);
      else this.vm.setText(path as TextPath, el.value);
    });
    form.addEventListener('change', (e) => {
      const el = e.target;
      if (el instanceof HTMLInputElement && el.matches('[data-reg-mode]'))
        this.vm.setMode(el.value as RegistrationMode);
      if (el instanceof HTMLSelectElement && el.dataset['field']) this.vm.blur(el.dataset['field']);
    });
    form.addEventListener('focusout', (e) => {
      const path = e.target instanceof HTMLElement ? e.target.dataset['field'] : undefined;
      if (path && path !== 'honeypot') this.vm.blur(path);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.vm.submit();
    });
    qs('[data-member-add]', this.root)?.addEventListener('click', () => this.vm.addMember());
    qs('[data-reg-retry]', this.root)?.addEventListener('click', () => void this.vm.retry());
    qs('[data-error-summary]', this.root)?.addEventListener('click', (e) => {
      const link =
        e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('[data-focus-path]') : null;
      if (!link) return;
      e.preventDefault();
      controlFor(this.root, link.dataset['focusPath'] ?? '')?.focus();
    });
  }

  // autofill ou voltar no histórico podem deixar valores nos inputs antes do JS
  private restoreFromDom(form: HTMLFormElement): void {
    const mode = qs<HTMLInputElement>('[data-reg-mode]:checked', form);
    if (mode && mode.value !== this.vm.fields.mode) this.vm.setMode(mode.value as RegistrationMode);
    qsa<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]', form).forEach((el) => {
      const path = el.dataset['field'];
      if (!path) return;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        if (el.checked) this.vm.setAcceptedTerms(true);
      } else if (el.value) {
        this.vm.setText(path as TextPath, el.value);
      }
    });
  }

  private render(state: RegistrationFormState, prev: RegistrationFormState | null): void {
    if (!state.open) {
      if (!prev || prev.open) this.lobby.show();
      return;
    }
    const { fields } = state;
    if (!prev || prev.fields.members !== fields.members || prev.canRemoveMember !== state.canRemoveMember) {
      this.rows?.sync(fields.members, state.canRemoveMember);
    }
    if (!prev || prev.fields.mode !== fields.mode) {
      qsa('[data-mode-only="team"]', this.root).forEach((el) => (el.hidden = fields.mode !== 'team'));
    }
    this.renderCounters(state);
    this.errors.render(state.errors);
    this.errors.renderSummary(state.attempted, state.orderedErrors);
    if (!prev || prev.status !== state.status) this.status.render(state);
    if (state.focus && state.focus.seq !== this.lastFocusSeq) {
      this.lastFocusSeq = state.focus.seq;
      this.focusPath(state.focus.path, state.focus.reason === 'invalid');
    }
  }

  private renderCounters(state: RegistrationFormState): void {
    const max = Number(this.root.dataset['teamMax'] ?? 0);
    const size = 1 + state.fields.members.length;
    const squad = qs('[data-reg-squad]', this.root);
    if (squad) squad.textContent = state.fields.mode === 'team' ? `Esquadrão ${size}/${max}` : 'Modo solo';
    const count = qs('[data-member-count]', this.root);
    if (count) count.textContent = `${size}/${max}`;
    const add = qs<HTMLButtonElement>('[data-member-add]', this.root);
    if (add) add.disabled = !state.canAddMember;
    const addLabel = qs('[data-member-add-label]', this.root);
    if (addLabel) addLabel.textContent = state.canAddMember ? 'Adicionar integrante' : 'Equipe completa';
  }

  private focusPath(path: string, announceErrors: boolean): void {
    controlFor(this.root, path)?.focus();
    const count = this.vm.state.value.orderedErrors.length;
    if (announceErrors && count > 0) {
      this.status.announce(
        count === 1 ? '1 campo precisa de ajuste.' : `${count} campos precisam de ajuste.`,
      );
    }
  }
}
