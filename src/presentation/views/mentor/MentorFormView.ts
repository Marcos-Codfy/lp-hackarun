import { qs, qsa } from '@shared/utils/dom';
import {
  isFieldVisible,
  isTextPath,
  type MentorFlagPath,
} from '@presentation/view-models/mentor/MentorFields';
import type {
  MentorFormState,
  MentorFormViewModel,
} from '@presentation/view-models/mentor/MentorFormViewModel';
import { ClosedLobby } from '../registration/ClosedLobby';
import { ErrorPresenter } from '../registration/ErrorPresenter';
import { PressGuard } from '../registration/PressGuard';
import { controlFor, pathOf } from '../registration/fieldLookup';
import { MentorStatusPresenter } from './MentorStatusPresenter';

// rolagem do app (nativa nas páginas leves): o alvo para logo abaixo do header fixo
export type ScrollToElement = (el: HTMLElement) => void;

type Control = HTMLInputElement | HTMLSelectElement;

const CONTROLS = 'input[data-field], select[data-field], textarea[data-field]';
const FLAGS: readonly string[] = ['mayPublish', 'acceptedTerms'];

// [data-mentor-form]: liga o DOM ao VM; valores moram nos campos, o VM só espelha
export class MentorFormView {
  private readonly root: HTMLElement;
  private readonly vm: MentorFormViewModel;
  private readonly errors: ErrorPresenter;
  private readonly status: MentorStatusPresenter;
  private readonly lobby: ClosedLobby;
  private readonly scrollTo: ScrollToElement;
  private lastFocusSeq = 0;

  constructor(
    root: HTMLElement,
    vm: MentorFormViewModel,
    scrollTo: ScrollToElement = (el) => el.scrollIntoView?.({ block: 'start' }),
  ) {
    this.root = root;
    this.vm = vm;
    this.scrollTo = scrollTo;
    this.errors = new ErrorPresenter(root);
    this.status = new MentorStatusPresenter(root);
    this.lobby = new ClosedLobby(root);
  }

  mount(): void {
    const form = qs<HTMLFormElement>('[data-reg-form]', this.root);
    // o build já fechou (ou ainda não abriu): o HTML estático basta
    if (!form || !this.vm.isOpen) return;
    this.bindForm(form, new PressGuard(form));
    this.restoreFromDom(form);
    this.vm.state.subscribe((state, prev) => this.render(state, prev === state ? null : prev));
  }

  private bindForm(form: HTMLFormElement, press: PressGuard): void {
    // texto a cada tecla; lista, opção e caixa no change
    const onValue = (e: Event) => {
      const el = e.target;
      if (!(
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      ))
        return;
      this.read(el as Control);
    };
    form.addEventListener('input', onValue);
    form.addEventListener('change', onValue);
    // opção (radio ou caixa) valida no change: o blur de passar de uma opção pra outra piscaria o erro à toa
    form.addEventListener('focusout', (e) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      const path = el ? pathOf(el) : null;
      if (!path || path === 'honeypot') return;
      if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) return;
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

  private read(el: Control | HTMLTextAreaElement): void {
    const path = el.dataset['field'] ?? '';
    if (path === 'days') {
      const checked = qsa<HTMLInputElement>('input[data-field="days"]:checked', this.root);
      this.vm.setDays(checked.map((box) => box.value));
      return;
    }
    if (FLAGS.includes(path) && el instanceof HTMLInputElement) {
      this.vm.setFlag(path as MentorFlagPath, el.checked);
      return;
    }
    if (!isTextPath(path)) return;
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

  private render(state: MentorFormState, prev: MentorFormState | null): void {
    if (!state.open) {
      if (!prev || prev.open) this.lobby.show();
      return;
    }
    if (!prev || prev.fields.graduate !== state.fields.graduate) this.renderSections(state);
    this.errors.render(state.errors);
    this.errors.renderSummary(state.attempted, state.orderedErrors);
    if (!prev || prev.status !== state.status) this.status.render(state);
    if (state.focus && state.focus.seq !== this.lastFocusSeq) {
      this.lastFocusSeq = state.focus.seq;
      this.focusPath(state.focus.path, state.focus.reason === 'invalid');
    }
  }

  // [data-show-field="course"]: o bloco do campo só aparece pra quem é egresso
  private renderSections(state: MentorFormState): void {
    qsa('[data-show-field]', this.root).forEach((el) => {
      el.hidden = !isFieldVisible(state.fields, el.dataset['showField'] ?? '');
    });
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
