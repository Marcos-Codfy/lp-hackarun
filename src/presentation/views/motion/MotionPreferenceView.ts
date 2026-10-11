import { qs } from '@shared/utils/dom';
import type { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';
import { MotionPauseSignal } from './MotionPauseSignal';

const TIP_DISMISSED = 'is-tip-dismissed';

// liga o VM ao DOM: a classe do <html> e os botões [data-motion-toggle] (header e menu mobile).
// Nome acessível fixo ("Pausar animações") + aria-pressed; o tooltip mostra a ação do próximo clique
export class MotionPreferenceView {
  constructor(
    private readonly vm: MotionPreferenceViewModel,
    private readonly buttons: readonly HTMLButtonElement[],
    private readonly signal = new MotionPauseSignal(),
  ) {}

  mount(): void {
    this.buttons.forEach((button) => this.bind(button));
    this.vm.paused.subscribe((paused) => {
      this.signal.set(paused);
      this.buttons.forEach((button) => this.render(button, paused));
    });
  }

  private bind(button: HTMLButtonElement): void {
    // começa hidden no HTML: sem JS não há o que pausar além do CSS, e o botão não funcionaria
    button.hidden = false;
    if (this.vm.locked) button.setAttribute('aria-disabled', 'true');
    button.addEventListener('click', () => this.vm.toggle());
    // WCAG 1.4.13: Esc esconde o tooltip sem tirar o foco; volta no próximo hover/foco
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') button.classList.add(TIP_DISMISSED);
    });
    const restore = () => button.classList.remove(TIP_DISMISSED);
    button.addEventListener('blur', restore);
    button.addEventListener('pointerleave', restore);
  }

  private render(button: HTMLButtonElement, paused: boolean): void {
    button.setAttribute('aria-pressed', String(paused));
    const tip = qs('[data-motion-tip]', button);
    if (tip) tip.textContent = this.vm.hint(paused);
  }
}
