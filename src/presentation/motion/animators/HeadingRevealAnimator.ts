import { gsap } from '@presentation/motion/core/gsap';
import { nextPaint, yieldToMain } from '@presentation/app/BootQueue';
import { qs, qsa } from '@shared/utils/dom';
import { LineSplit } from './heading/LineSplit';
import { SectionAnimator } from './SectionAnimator';
import { unveil, veil } from './veil';

const LINE_CLASS = 'reveal-line';

// títulos das seções: linhas sobem de trás de uma máscara; eyebrow e lead entram logo depois.
// No boot só o véu; a divisão em linhas (mede as palavras) roda quando o título chega perto da tela
export class HeadingRevealAnimator extends SectionAnimator {
  protected readonly selector = '[data-reveal="heading"]';

  protected override setup(el: HTMLElement): void {
    const parts = qsa('[data-reveal-part]', el);
    const title = qs('[data-reveal-title]', el);
    this.whenNear(el, () => this.reveal(el, parts, title), title ? [...parts, title] : parts);
  }

  protected override setupReduced(el: HTMLElement): void {
    this.whenNear(
      el,
      () =>
        gsap.from(el, { opacity: 0, duration: 0.6, ease: 'power1.out', scrollTrigger: this.entrance(el) }),
      [el],
    );
  }

  private reveal(el: HTMLElement, parts: HTMLElement[], title: HTMLElement | null): void {
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
    if (!title) return;
    // as linhas numa tarefa própria, com o título velado até o tween delas existir (nada pisca).
    // A quebra depende da fonte final: se ela ainda vem, espera a troca passar por um frame antes de medir
    veil([title]);
    const ready = document.fonts.status === 'loaded' ? yieldToMain() : document.fonts.ready.then(nextPaint);
    ready
      .then(() => {
        if (!this.active) return;
        this.later(() => {
          // véu sai antes: se a divisão quebrar, o título aparece inteiro
          unveil([title]);
          this.splitLines(title, el);
        });
      })
      .catch((error: unknown) => console.error('[motion] heading split failed', error));
  }

  private splitLines(title: HTMLElement, trigger: HTMLElement): void {
    const split = LineSplit.create(title, LINE_CLASS);
    if (!split) {
      // estrutura que não dá pra dividir: o título entra inteiro
      gsap.from(title, {
        y: 24,
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        scrollTrigger: this.entrance(trigger),
      });
      return;
    }
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: this.entrance(trigger),
      // devolve o HTML original: sem spans extras pro leitor de tela nem pro resize
      onComplete: () => split.revert(),
    });
  }
}
