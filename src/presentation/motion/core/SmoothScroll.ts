import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { resolveTarget, targetY, type ScrollDriver, type ScrollRequest } from './ScrollDriver';

// Adapter do Lenis pro contrato do app, sincronizado com o ScrollTrigger num único ticker (o do gsap)
export class SmoothScroll implements ScrollDriver {
  private readonly lenis: Lenis;
  private readonly offScroll: () => void;
  private readonly raf = (time: number): void => this.lenis.raf(time * 1000);

  constructor() {
    this.lenis = new Lenis({
      autoRaf: false,
      anchors: false,
      lerp: 0.1,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
    });
    this.offScroll = this.lenis.on('scroll', () => ScrollTrigger.update());
    gsap.ticker.add(this.raf);
    gsap.ticker.lagSmoothing(0);
  }

  scrollTo(target: string | HTMLElement, options: ScrollRequest = {}): void {
    const el = resolveTarget(target);
    if (el) this.travel(el, options, false);
  }

  // seções com render adiado (content-visibility) montam no caminho e empurram o destino:
  // ao chegar confere onde o alvo está de fato e faz uma 2ª passada curta se precisar
  private travel(el: HTMLElement, options: ScrollRequest, correcting: boolean): void {
    this.lenis.scrollTo(targetY(el, this.lenis.animatedScroll, options.offset), {
      immediate: options.immediate ?? false,
      // clique explícito do usuário vale mesmo com o scroll parado (ex.: menu fechando)
      force: true,
      ...(correcting ? { duration: 0.45 } : {}),
      onComplete: () => {
        const drift = Math.abs(
          targetY(el, this.lenis.animatedScroll, options.offset) - this.lenis.animatedScroll,
        );
        if (!correcting && drift > 6) this.travel(el, options, true);
        else options.onComplete?.();
      },
    });
  }

  stop(): void {
    this.lenis.stop();
  }

  start(): void {
    this.lenis.start();
  }

  destroy(): void {
    this.offScroll();
    gsap.ticker.remove(this.raf);
    this.lenis.destroy();
  }
}
