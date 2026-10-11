import { gsap, ScrollTrigger } from '@presentation/motion/core/gsap';
import { qs, qsa } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

// linha do tempo da programação: o traço desenha com o scroll e cada round acende ao ser alcançado.
// Os gatilhos (um por round) só nascem quando a programação chega perto da tela
export class TimelineAnimator extends SectionAnimator {
  protected readonly selector = '[data-timeline]';

  protected override setup(el: HTMLElement): void {
    const fill = qs('[data-timeline-fill]', el);
    this.whenNear(el, () => this.track(el, fill), fill ? [fill] : []);
  }

  // sem movimento: tudo já aceso, linha cheia (estado padrão do CSS)
  protected override setupReduced(el: HTMLElement): void {
    qsa('[data-timeline-node]', el).forEach((node) => node.classList.add('is-reached'));
  }

  private track(el: HTMLElement, fill: HTMLElement | null): void {
    if (fill) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 70%', end: 'bottom 70%', scrub: 0.4 },
        },
      );
    }

    for (const node of qsa('[data-timeline-node]', el)) {
      ScrollTrigger.create({
        trigger: node,
        start: 'top 70%',
        onEnter: () => node.classList.add('is-reached'),
        onLeaveBack: () => node.classList.remove('is-reached'),
      });
    }
  }
}
