import { gsap, ScrollTrigger } from '@presentation/motion/core/gsap';
import { qsa } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

// feixes do palco (CSS): acendem na entrada e ficam pausados quando a seção sai da tela
export class SpotlightAnimator extends SectionAnimator {
  protected readonly selector = '[data-spotlight]';

  protected override setup(el: HTMLElement): void {
    el.classList.add('is-idle');
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => el.classList.toggle('is-idle', !self.isActive),
    });

    const beams = qsa('[data-beam]', el);
    if (beams.length === 0) return;
    gsap.from(beams, {
      opacity: 0,
      duration: 1.8,
      ease: 'power2.out',
      stagger: 0.25,
      scrollTrigger: this.entrance(el, 'top 70%'),
    });
  }
}
