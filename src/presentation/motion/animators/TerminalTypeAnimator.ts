import { gsap } from '@presentation/motion/core/gsap';
import type { AppContext } from '@presentation/app/AppContext';
import { qs, qsa } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

const SECONDS_PER_CHAR = 0.045;
const BOOT_STAGGER = 0.32;

// terminal do NPC: as linhas de conexão sobem uma a uma e a dica é "digitada" de novo quando entra na tela
// (o leitor de tela lê a cópia sr-only, então digitar não gera ruído); cada caractere avisa o bus pro clique.
// No boot só limpa o texto e vela as linhas; a timeline nasce quando o terminal chega perto da tela
export class TerminalTypeAnimator extends SectionAnimator {
  protected readonly selector = '[data-terminal]';

  protected override setup(el: HTMLElement, ctx: AppContext): void {
    const output = qs('[data-type-text]', el);
    const chars = Array.from(output?.textContent ?? '');
    if (!output || chars.length === 0) return;

    const boot = qsa('[data-terminal-boot]', el);
    output.textContent = '';
    this.whenNear(el, () => this.type(el, output, chars, boot, ctx), boot);
  }

  private type(
    el: HTMLElement,
    output: HTMLElement,
    chars: string[],
    boot: HTMLElement[],
    ctx: AppContext,
  ): void {
    const state = { count: 0 };
    let shown = 0;

    const timeline = gsap.timeline({ scrollTrigger: this.entrance(el, 'top 75%') });
    if (boot.length > 0) {
      timeline.from(boot, { opacity: 0, x: -8, duration: 0.35, ease: 'power2.out', stagger: BOOT_STAGGER });
    }
    timeline.to(state, {
      count: chars.length,
      duration: Math.min(3.2, chars.length * SECONDS_PER_CHAR),
      ease: 'none',
      delay: 0.25,
      onStart: () => el.classList.add('is-typing'),
      onUpdate: () => {
        const next = Math.round(state.count);
        if (next <= shown) return;
        const typed = chars.slice(shown, next);
        shown = next;
        output.textContent = chars.slice(0, next).join('');
        // espaço não faz clique: o ritmo fica mais natural
        if (typed.some((c) => c.trim() !== '')) ctx.bus.emit('ui:type', undefined);
      },
      onComplete: () => {
        el.classList.remove('is-typing');
        el.classList.add('is-typed');
      },
    });
  }
}
