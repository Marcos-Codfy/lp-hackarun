import { qs, qsa } from '@shared/utils/dom';
import type {
  RegistrationFormState,
  RegistrationFormViewModel,
} from '@presentation/view-models/registration/RegistrationFormViewModel';
import {
  doneCount,
  REGISTRATION_STEPS,
  stepStates,
  stepsWithErrors,
} from '@presentation/view-models/registration/registrationSteps';

const FIRST_CONTROL = 'input:not([type="hidden"]):not([tabindex="-1"]), select, button, a[href]';

// campo escondido pelo perfil ou desligado não recebe foco: pula pro próximo
const canFocus = (el: HTMLElement): boolean =>
  !el.closest('[hidden], [inert]') && !(el as HTMLButtonElement | HTMLInputElement).disabled;

// [data-form-progress]: marca as etapas prontas e a atual (a do foco; sem foco, a primeira que falta).
// O link de cada etapa rola até ela e foca o primeiro campo, sem mexer no endereço (o "Voltar ao evento"
// conta com o histórico limpo). Some com o formulário fechado ou enviado
export class StepProgressView {
  private focused: number | null = null;
  private readonly items: HTMLElement[];

  constructor(
    private readonly root: HTMLElement,
    private readonly form: HTMLElement,
    private readonly vm: RegistrationFormViewModel,
    private readonly reducedMotion: boolean,
  ) {
    this.items = qsa('[data-step-item]', root);
  }

  mount(): void {
    // foco fora das etapas (o resumo de erros depois de um envio vazio): a atual volta a ser a 1ª que falta
    this.form.addEventListener('focusin', (event) => {
      const step = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-step]') : null;
      const index = step ? Number(step.dataset['step']) : NaN;
      const next = Number.isNaN(index) ? null : index;
      if (next === this.focused) return;
      this.focused = next;
      this.render(this.vm.state.value);
    });
    this.root.addEventListener('click', (event) => this.onClick(event));
    this.vm.state.subscribe((state, prev) => {
      if (
        state === prev ||
        state.steps !== prev.steps ||
        state.status !== prev.status ||
        state.open !== prev.open
      )
        this.render(state);
    });
  }

  private render(state: RegistrationFormState): void {
    this.root.hidden = !state.open || state.status === 'success';
    if (this.root.hidden) return;
    const states = stepStates(state.steps, this.focused);
    const invalid = stepsWithErrors(state.errors);
    this.items.forEach((item, i) => {
      const s = states[i];
      if (!s) return;
      item.toggleAttribute('data-done', s.done);
      item.toggleAttribute('data-current', s.current);
      item.toggleAttribute('data-invalid', invalid.has(i));
      const link = qs('a', item);
      if (s.current) link?.setAttribute('aria-current', 'step');
      else link?.removeAttribute('aria-current');
      const sr = qs('[data-step-sr]', item);
      if (sr) sr.textContent = s.done ? ', pronta' : invalid.has(i) ? ', com campos a ajustar' : '';
    });
    const done = doneCount(state.steps);
    const count = qs('[data-step-done]', this.root);
    if (count) count.textContent = String(done);
    this.root.style.setProperty('--progress', String(done / REGISTRATION_STEPS.length));
  }

  private onClick(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link =
      event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
    const step = link ? document.getElementById(link.hash.slice(1)) : null;
    if (!link || !step) return;
    event.preventDefault();
    step.scrollIntoView({ block: 'start', behavior: this.reducedMotion ? 'instant' : 'smooth' });
    qsa<HTMLElement>(FIRST_CONTROL, step).find(canFocus)?.focus({ preventScroll: true });
  }
}
