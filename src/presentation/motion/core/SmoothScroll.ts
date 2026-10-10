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
    if (!el) return;
    const { onComplete } = options;
    this.lenis.scrollTo(targetY(el, this.lenis.animatedScroll, options.offset), {
      immediate: options.immediate ?? false,
      // clique explícito do usuário vale mesmo com o scroll parado (ex.: menu fechando)
      force: true,
      ...(onComplete ? { onComplete: () => onComplete() } : {}),
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
