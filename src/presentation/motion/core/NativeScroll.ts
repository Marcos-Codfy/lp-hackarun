import { resolveTarget, targetY, type ScrollDriver, type ScrollRequest } from './ScrollDriver';

// reduced motion: scroll do navegador, sempre instantâneo
export class NativeScroll implements ScrollDriver {
  private readonly root = document.documentElement;

  scrollTo(target: string | HTMLElement, options: ScrollRequest = {}): void {
    const el = resolveTarget(target);
    if (!el) return;
    const jump = () =>
      window.scrollTo({ top: targetY(el, window.scrollY, options.offset), behavior: 'instant' });
    jump();
    // seções com render adiado montam no frame seguinte e mudam a altura: corrige uma vez
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        jump();
        options.onComplete?.();
      }),
    );
  }

  stop(): void {
    this.root.style.overflow = 'hidden';
  }

  start(): void {
    this.root.style.removeProperty('overflow');
  }

  destroy(): void {
    this.start();
  }
}
