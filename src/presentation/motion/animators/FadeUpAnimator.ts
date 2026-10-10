import { gsap, ScrollTrigger } from '@presentation/motion/core/gsap';
import { SectionAnimator } from './SectionAnimator';

const HIDDEN = { y: 40, opacity: 0 };
const TIMING = { duration: 1, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity' };

// [data-reveal="up"] entra sozinho; [data-reveal-group] entra filho a filho, em lotes
// (lote = os filhos que chegam juntos na tela; lista longa no celular não anima fora da vista)
export class FadeUpAnimator extends SectionAnimator {
  protected readonly selector = '[data-reveal="up"], [data-reveal-group]';

  protected override setup(el: HTMLElement): void {
    if (!el.hasAttribute('data-reveal-group')) {
      gsap.from(el, { ...HIDDEN, ...TIMING, scrollTrigger: this.entrance(el) });
      return;
    }
    const items = Array.from(el.children);
    if (items.length === 0) return;
    // estado escondido só nasce aqui, no JS: sem script o conteúdo já está visível
    gsap.set(items, HIDDEN);
    try {
      ScrollTrigger.batch(items, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, ...TIMING }),
      });
    } catch (error) {
      // se o trigger não nasceu, ninguém pode ficar invisível
      gsap.set(items, { clearProps: 'transform,opacity' });
      throw error;
    }
  }

  protected override setupReduced(el: HTMLElement): void {
    const targets = el.hasAttribute('data-reveal-group') ? Array.from(el.children) : [el];
    gsap.from(targets, { opacity: 0, duration: 0.6, stagger: 0.04, scrollTrigger: this.entrance(el) });
  }
}
