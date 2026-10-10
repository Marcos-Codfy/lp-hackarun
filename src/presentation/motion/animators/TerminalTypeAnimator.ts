import { gsap } from '@presentation/motion/core/gsap';
import { qs } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

const SECONDS_PER_CHAR = 0.045;

// terminal do NPC: apaga a dica e "digita" de novo quando entra na tela
// (o leitor de tela lê a cópia sr-only, então digitar não gera ruído)
export class TerminalTypeAnimator extends SectionAnimator {
  protected readonly selector = '[data-terminal]';

  protected override setup(el: HTMLElement): void {
    const output = qs('[data-type-text]', el);
    const chars = Array.from(output?.textContent ?? '');
    if (!output || chars.length === 0) return;

    output.textContent = '';
    const state = { count: 0 };
    let shown = 0;
    gsap.to(state, {
      count: chars.length,
      duration: Math.min(3.2, chars.length * SECONDS_PER_CHAR),
      ease: 'none',
      delay: 0.5,
      scrollTrigger: this.entrance(el, 'top 75%'),
      onUpdate: () => {
        const next = Math.round(state.count);
        if (next === shown) return;
        shown = next;
        output.textContent = chars.slice(0, next).join('');
      },
      onComplete: () => el.classList.add('is-typed'),
    });
  }
}
