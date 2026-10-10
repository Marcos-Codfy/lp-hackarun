import { resolveTarget, targetY, type ScrollDriver, type ScrollRequest } from './ScrollDriver';

// reduced motion: scroll do navegador, sempre instantâneo
export class NativeScroll implements ScrollDriver {
  private readonly root = document.documentElement;

  scrollTo(target: string | HTMLElement, options: ScrollRequest = {}): void {
    const el = resolveTarget(target);
    if (!el) return;
    window.scrollTo({ top: targetY(el, window.scrollY, options.offset), behavior: 'instant' });
    options.onComplete?.();
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
