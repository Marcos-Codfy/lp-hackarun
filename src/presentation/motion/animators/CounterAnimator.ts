import { gsap } from '@presentation/motion/core/gsap';
import { SectionAnimator } from './SectionAnimator';

// números contam de 0 até o valor do HTML quando aparecem (o valor final já vem no SSR)
export class CounterAnimator extends SectionAnimator {
  protected readonly selector = '[data-count-to]';

  protected override setup(el: HTMLElement): void {
    const target = Number(el.dataset['countTo']);
    if (!Number.isFinite(target) || target <= 0) return;
    const pad = Number(el.dataset['countPad'] ?? 0);
    const format = (value: number) => String(Math.round(value)).padStart(pad, '0');

    const state = { value: 0 };
    let shown = format(0);
    el.textContent = shown;
    gsap.to(state, {
      value: target,
      duration: Math.min(1.8, 0.8 + target * 0.08),
      ease: 'power2.out',
      scrollTrigger: this.entrance(el, 'top 90%'),
      onUpdate: () => {
        // só toca no DOM quando o número visível muda
        const next = format(state.value);
        if (next === shown) return;
        shown = next;
        el.textContent = next;
      },
    });
  }
}
