import type { EventBus } from '@shared/core/EventBus';
import { qs, qsa } from '@shared/utils/dom';
import type { AppEvents } from '@presentation/app/AppEvents';
import {
  isFieldPath,
  visibleFields,
  type FieldPath,
} from '@presentation/view-models/registration/RegistrationFields';
import type {
  RegistrationFormState,
  RegistrationFormViewModel,
} from '@presentation/view-models/registration/RegistrationFormViewModel';
import { ClosedLobby } from './registration/ClosedLobby';
import { ErrorPresenter } from './registration/ErrorPresenter';
import { PressGuard } from './registration/PressGuard';
import { SubmitStatusPresenter } from './registration/SubmitStatusPresenter';
import { controlFor, pathOf } from './registration/fieldLookup';

// rolagem do app (Lenis ou nativa): o alvo para logo abaixo do header fixo
export type ScrollToElement = (el: HTMLElement) => void;

type Control = HTMLInputElement | HTMLSelectElement;

const CONTROLS = 'input[data-field], select[data-field]';

// [data-registration-form]: liga o DOM ao VM; valores moram nos campos, o VM só espelha
export class RegistrationFormView {
  private readonly root: HTMLElement;
  private readonly vm: RegistrationFormViewModel;
  private readonly errors: ErrorPresenter;
  private readonly status: SubmitStatusPresenter;
  private readonly lobby: ClosedLobby;
  private readonly scrollTo: ScrollToElement;
  private lastFocusSeq = 0;

  constructor(
    root: HTMLElement,
    vm: RegistrationFormViewModel,
    bus: EventBus<AppEvents>,
    scrollTo: ScrollToElement = (el) => el.scrollIntoView?.({ block: 'start' }),
  ) {
    this.root = root;
    this.vm = vm;
    this.scrollTo = scrollTo;
    this.errors = new ErrorPresenter(root);
    this.status = new SubmitStatusPresenter(root, bus);
    this.lobby = new ClosedLobby(root);
  }

  mount(): void {
    const form = qs<HTMLFormElement>('[data-reg-form]', this.root);
    // o build já fechou (ou ainda não abriu): o HTML estático basta
    if (!form || !this.vm.isOpen) return;
    this.vm.refreshAvailability();
    this.bindForm(form, new PressGuard(form));
    this.restoreFromDom(form);
    this.vm.state.subscribe((state, prev) => this.render(state, prev === state ? null : prev));
  }

  private bindForm(form: HTMLFormElement, press: PressGuard): void {
    // texto a cada tecla; lista e opção no change (o input do select e do radio chega junto)
    const onValue = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
      this.read(el);
    };
    form.addEventListener('input', onValue);
    form.addEventListener('change', onValue);
    // opção (radio) valida no change: o blur de passar de uma opção pra outra piscaria o erro à toa
    form.addEventListener('focusout', (e) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      const path = el ? pathOf(el) : null;
      if (!path || path === 'honeypot' || (el instanceof HTMLInputElement && el.type === 'radio')) return;
      press.run(() => this.vm.blur(path));
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.vm.submit();
    });
    qs('[data-reg-retry]', this.root)?.addEventListener('click', () => void this.vm.retry());
    qs('[data-error-summary]', this.root)?.addEventListener('click', (e) => {
      const link =
        e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('[data-focus-path]') : null;
      if (!link) return;
      e.preventDefault();
      controlFor(this.root, link.dataset['focusPath'] ?? '')?.focus();
    });
  }

  private read(el: Control): void {
    const path = el.dataset['field'] ?? '';
    if (path === 'acceptedTerms' && el instanceof HTMLInputElement) {
      this.vm.setAcceptedTerms(el.checked);
      return;
    }
    if (!isFieldPath(path)) return;
    // radio desmarcado não muda nada: o marcado do mesmo grupo é quem fala
    if (el instanceof HTMLInputElement && el.type === 'radio' && !el.checked) return;
    if (el.value !== this.vm.fields[path]) this.vm.setValue(path, el.value);
  }

  // autofill, voltar no histórico ou o que foi digitado antes do chunk chegar
  private restoreFromDom(form: HTMLFormElement): void {
    qsa<Control>(CONTROLS, form).forEach((el) => {
      const checkable = el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio');
      if (checkable ? (el as HTMLInputElement).checked : el.value) this.read(el);
    });
  }

  private render(state: RegistrationFormState, prev: RegistrationFormState | null): void {
    if (!state.open) {
      if (!prev || prev.open) this.lobby.show();
      return;
    }
    const { fields } = state;
    if (!prev || prev.fields.profile !== fields.profile) this.renderSections(fields.profile);
    if (!prev || prev.fields.adult !== fields.adult) this.renderMinorNotice(fields.adult === 'no');
    this.errors.render(state.errors);
    this.errors.renderSummary(state.attempted, state.orderedErrors);
    if (!prev || prev.status !== state.status) this.status.render(state);
    if (state.focus && state.focus.seq !== this.lastFocusSeq) {
      this.lastFocusSeq = state.focus.seq;
      this.focusPath(state.focus.path, state.focus.reason === 'invalid');
    }
  }

  // [data-show-field="course"]: o bloco do campo só aparece pro perfil que pede ele
  private renderSections(profile: RegistrationFormState['fields']['profile']): void {
    const visible = visibleFields(profile);
    qsa('[data-show-field]', this.root).forEach((el) => {
      el.hidden = !visible.has(el.dataset['showField'] as FieldPath);
    });
    const details = qs('[data-profile-details]', this.root);
    if (details) details.hidden = !profile;
  }

  private renderMinorNotice(minor: boolean): void {
    const notice = qs('[data-minor-notice]', this.root);
    if (notice) notice.hidden = !minor;
  }

  // envio com vários erros: o foco vai pro resumo (título e lista inteiros na tela, logo abaixo do header),
  // que se anuncia pelo título ("Faltam ajustar 3 campos:"). Com um erro só, direto pro campo
  private focusPath(path: string, announceErrors: boolean): void {
    const count = this.vm.state.value.orderedErrors.length;
    const summary = qs('[data-error-summary]', this.root);
    if (announceErrors && count > 1 && summary && !summary.hidden) {
      summary.focus({ preventScroll: true });
      this.scrollTo(summary);
      return;
    }
    controlFor(this.root, path)?.focus();
    if (announceErrors && count > 0) {
      this.status.announce(
        count === 1 ? '1 campo precisa de ajuste.' : `${count} campos precisam de ajuste.`,
      );
    }
  }
}
