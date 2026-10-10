import { gsap } from '@presentation/motion/core/gsap';
import { qsa } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

// barras de pontuação crescem da esquerda (a largura final é CSS, aqui só scaleX)
export class BarGrowAnimator extends SectionAnimator {
  protected readonly selector = '[data-bars]';

  protected override setup(el: HTMLElement): void {
    const fills = qsa('[data-bar-fill]', el);
    if (fills.length === 0) return;
    gsap.from(fills, {
      scaleX: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.12,
      delay: 0.2,
      scrollTrigger: this.entrance(el, 'top 80%'),
    });
  }
}
