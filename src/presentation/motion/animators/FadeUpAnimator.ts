import { gsap, ScrollTrigger } from '@presentation/motion/core/gsap';
import { SectionAnimator } from './SectionAnimator';

const HIDDEN = { y: 40, opacity: 0 };
const TIMING = { duration: 1, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity' };

const isGroup = (el: HTMLElement): boolean => el.hasAttribute('data-reveal-group');

function targetsOf(el: HTMLElement): HTMLElement[] {
  if (!isGroup(el)) return [el];
  return Array.from(el.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
}

// [data-reveal="up"] entra sozinho; [data-reveal-group] entra filho a filho, em lotes
// (lote = os filhos que chegam juntos na tela; lista longa no celular não anima fora da vista).
// O gsap.set dos filhos lê o estilo de cada um: só roda quando o grupo chega perto da tela
export class FadeUpAnimator extends SectionAnimator {
  protected readonly selector = '[data-reveal="up"], [data-reveal-group]';

  protected override setup(el: HTMLElement): void {
    const items = targetsOf(el);
    if (items.length === 0) return;
    this.whenNear(el, () => (isGroup(el) ? this.batch(items) : this.single(el)), items);
  }

  protected override setupReduced(el: HTMLElement): void {
    const items = targetsOf(el);
    if (items.length === 0) return;
    this.whenNear(
      el,
      () => gsap.from(items, { opacity: 0, duration: 0.6, stagger: 0.04, scrollTrigger: this.entrance(el) }),
      items,
    );
  }

  private single(el: HTMLElement): void {
    gsap.from(el, { ...HIDDEN, ...TIMING, scrollTrigger: this.entrance(el) });
  }

  private batch(items: HTMLElement[]): void {
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
}
