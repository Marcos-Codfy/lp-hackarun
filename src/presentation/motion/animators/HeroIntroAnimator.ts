import { gsap } from '@presentation/motion/core/gsap';
import type { AppContext } from '@presentation/app/AppContext';
import { qs, qsa } from '@shared/utils/dom';
import type { LogoLightning } from './hero/lightning/LogoLightning';
import { SectionAnimator } from './SectionAnimator';

// a entrada do logo e das linhas do hero roda em CSS no 1º paint (o logo é o LCP e não espera JS).
// Aqui fica o que depende de JS: os raios em volta do logo e a saída do conteúdo no scroll.
// Reduced motion: nada disso roda (setupReduced padrão), o hero fica estático e completo
export class HeroIntroAnimator extends SectionAnimator {
  protected readonly selector = '[data-hero]';
  private lightning: LogoLightning | null = null;

  protected override setup(hero: HTMLElement, ctx: AppContext): void {
    // os tweens leem o estilo de cada camada: cada um numa tarefa logo depois de um frame
    this.afterPaint('hero fade', () => this.fadeLayers(hero));
    this.afterPaint('hero logo', () => this.growLogo(hero));
    // raios: chunk próprio, logo depois do boot e antes do 3D (que ocupa a GPU compilando shaders)
    this.afterPaint('hero lightning', () => this.mountLightning(hero, ctx));
  }

  override teardown(): void {
    super.teardown();
    this.lightning?.destroy();
    this.lightning = null;
  }

  private scrub(hero: HTMLElement): ScrollTrigger.Vars {
    return { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  }

  private fadeLayers(hero: HTMLElement): void {
    const layers = qsa('[data-hero-fade]', hero);
    if (layers.length === 0) return;
    // fromTo: o valor inicial é sempre 1, mesmo se a entrada em CSS ainda estiver no meio
    gsap.fromTo(
      layers,
      { yPercent: 0, opacity: 1 },
      { yPercent: -8, opacity: 0, ease: 'none', scrollTrigger: this.scrub(hero) },
    );
  }

  // o logo sai um pouco mais devagar e cresce: sensação de câmera passando por ele
  private growLogo(hero: HTMLElement): void {
    const logo = qs('[data-hero-logo-wrap]', hero);
    if (logo) gsap.to(logo, { scale: 1.08, ease: 'none', scrollTrigger: this.scrub(hero) });
  }

  private mountLightning(hero: HTMLElement, ctx: AppContext): void {
    const canvas = qs<HTMLCanvasElement>('[data-hero-lightning]', hero);
    const logo = qs<HTMLImageElement>('[data-hero-logo]', hero);
    const host = qs('[data-hero-logo-wrap]', hero);
    if (!canvas || !logo || !host || !this.active) return;
    import('./hero/lightning/LogoLightning')
      .then(({ LogoLightning }) => {
        if (!this.active) return undefined;
        this.lightning = new LogoLightning({ canvas, logo, host, lite: ctx.coarsePointer });
        return this.lightning.mount();
      })
      .catch((error: unknown) => console.error('[hero] lightning failed', error));
  }
}
