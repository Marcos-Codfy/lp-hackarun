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
import { PressGuard } from './registration/PressGuard';
import { SubmitStatusPresenter } from './registration/SubmitStatusPresenter';
import { TeamImagePicker } from './registration/TeamImagePicker';
import { controlFor, pathOf } from './registration/fieldLookup';

// rolagem do app (Lenis ou nativa): o alvo para logo abaixo do header fixo
export type ScrollToElement = (el: HTMLElement) => void;

// [data-registration-form]: liga o DOM ao VM; valores moram nos inputs, o VM só espelha
export class RegistrationFormView {
  private readonly root: HTMLElement;
  private readonly vm: RegistrationFormViewModel;
  private readonly errors: ErrorPresenter;
  private readonly status: SubmitStatusPresenter;
  private readonly lobby: ClosedLobby;
  private readonly scrollTo: ScrollToElement;
  private rows: MemberRows | null = null;
  private image: TeamImagePicker | null = null;
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
    const list = qs('[data-members-list]', this.root);
    const template = qs<HTMLTemplateElement>('template[data-member-template]', this.root);
    const press = new PressGuard(form);
    if (list && template) {
      this.rows = new MemberRows(list, template, {
        input: (i, field, value) => this.vm.setText(`members.${i}.${field}`, value),
        // a posição vale na hora de validar: o "Remover" segurado pelo PressGuard pode ter tirado a linha
        // (ou subido as de baixo) entre o blur e a validação
        blur: (i, field) => {
          const row = list.children[i];
          press.run(() => {
            const index = Array.prototype.indexOf.call(list.children, row) as number;
            if (index >= 0) this.vm.blur(`members.${index}.${field}`);
          });
        },
        remove: (i) => this.vm.removeMember(i),
      });
    }
    this.image = new TeamImagePicker(form, (file) => void this.vm.chooseTeamImage(file));
    this.bindForm(form, press);
    this.restoreFromDom(form);
    this.vm.state.subscribe((state, prev) => this.render(state, prev === state ? null : prev));
  }

  private bindForm(form: HTMLFormElement, press: PressGuard): void {
    form.addEventListener('input', (e) => {
      const el = e.target;
      // o arquivo da foto é do TeamImagePicker (change); os integrantes são do MemberRows
      if (!(el instanceof HTMLInputElement) || el.type === 'file') return;
      const path = el.dataset['field'];
      if (!path) return;
      if (el.type === 'checkbox') this.vm.setAcceptedTerms(el.checked);
      else this.vm.setText(path as TextPath, el.value);
    });
    // a foto não valida no blur: abrir o seletor de arquivo já tira o foco e o erro piscaria à toa
    form.addEventListener('focusout', (e) => {
      const path = e.target instanceof HTMLElement ? e.target.dataset['field'] : undefined;
      if (path && path !== 'honeypot' && path !== 'teamImage') press.run(() => this.vm.blur(path));
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

  // autofill, voltar no histórico ou o que foi digitado nos cards do HTML antes do chunk chegar
  private restoreFromDom(form: HTMLFormElement): void {
    qsa<HTMLInputElement>('input[data-field], input[data-member-field]', form).forEach((el) => {
      const path = pathOf(el);
      if (!path || el.type === 'file') return;
      if (el.type === 'checkbox') {
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
    this.renderCounters(state);
    if (state.announcement && state.announcement !== prev?.announcement) {
      this.status.announce(state.announcement.text);
    }
    if (!prev || prev.imageStatus !== state.imageStatus || prev.fields.teamImage !== fields.teamImage) {
      this.image?.render(state);
    }
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
    const size = state.fields.members.length;
    const squad = qs('[data-reg-squad]', this.root);
    if (squad) squad.textContent = `Esquadrão ${size}/${max}`;
    const count = qs('[data-member-count]', this.root);
    if (count) count.textContent = `${size}/${max}`;
    const add = qs<HTMLButtonElement>('[data-member-add]', this.root);
    if (add) add.disabled = !state.canAddMember;
    const addLabel = qs('[data-member-add-label]', this.root);
    if (addLabel)
      addLabel.textContent = state.canAddMember ? 'Adicionar integrante' : `Equipe completa · ${max}/${max}`;
  }

  // envio com vários erros: o foco vai pro resumo (título e lista inteiros na tela, logo abaixo do header),
  // que se anuncia pelo título ("Faltam ajustar 9 campos:"). Com um erro só, direto pro campo
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
