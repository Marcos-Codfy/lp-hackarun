import { gsap, SplitText } from '@presentation/motion/core/gsap';
import { qs, qsa } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

// títulos das seções: linhas sobem de trás de uma máscara; eyebrow e lead entram logo depois
export class HeadingRevealAnimator extends SectionAnimator {
  protected readonly selector = '[data-reveal="heading"]';

  protected override setup(el: HTMLElement): void {
    const parts = qsa('[data-reveal-part]', el);
    if (parts.length > 0) {
      gsap.from(parts, {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.1,
        delay: 0.1,
        clearProps: 'transform,opacity',
        scrollTrigger: this.entrance(el),
      });
    }

    const title = qs('[data-reveal-title]', el);
    if (!title) return;
    // a quebra de linha depende da fonte final: só divide depois que ela carregou
    void document.fonts.ready.then(() => this.later(() => this.splitLines(title, el)));
  }

  protected override setupReduced(el: HTMLElement): void {
    gsap.from(el, { opacity: 0, duration: 0.6, ease: 'power1.out', scrollTrigger: this.entrance(el) });
  }

  private splitLines(title: HTMLElement, trigger: HTMLElement): void {
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'reveal-line' });
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: this.entrance(trigger),
      // devolve o HTML original: sem divs extras pro leitor de tela nem pro resize
      onComplete: () => split.revert(),
    });
  }
}
