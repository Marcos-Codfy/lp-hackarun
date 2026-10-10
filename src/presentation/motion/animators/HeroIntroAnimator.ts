import { gsap, ScrollTrigger } from '@presentation/motion/core/gsap';
import { qs } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

// a montagem do wordmark, o traço do sublinhado e as linhas de HUD rodam em CSS no 1º paint
// (o H1 é o LCP e não pode esperar JS). Aqui fica só o que depende de JS:
// a faísca elétrica correndo o sublinhado e a saída do conteúdo quando o scroll começa
export class HeroIntroAnimator extends SectionAnimator {
  protected readonly selector = '[data-hero]';

  protected override setup(hero: HTMLElement): void {
    this.exitOnScroll(hero);
    this.spark(hero);
  }

  private exitOnScroll(hero: HTMLElement): void {
    const content = qs('[data-hero-content]', hero);
    if (!content) return;
    gsap.to(content, {
      yPercent: -10,
      opacity: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  private spark(hero: HTMLElement): void {
    const spark = qs<SVGPathElement>('[data-hero-spark]', hero);
    const bolt = qs<SVGPathElement>('[data-hero-bolt]', hero);
    if (!spark) return;

    // pathLength=1: traço de 0.08 entra antes do começo e sai depois do fim
    const loop = gsap
      .timeline({ repeat: -1, repeatDelay: 2.8, delay: 1.8 })
      .fromTo(
        spark,
        { strokeDashoffset: 0.08 },
        { strokeDashoffset: -1, duration: 1.1, ease: 'power2.inOut' },
      );
    if (bolt) loop.to(bolt, { opacity: 0.45, duration: 0.05, repeat: 3, yoyo: true }, '<0.85');

    // fora da tela não roda
    ScrollTrigger.create({
      trigger: hero,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? loop.resume() : loop.pause()),
    });
  }
}
