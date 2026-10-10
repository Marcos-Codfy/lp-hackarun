import type { MotionHandle } from '@presentation/app/AppContext';

// links internos marcados com data-nav-link passam pelo smooth scroll e levam o foco junto
// (sem isso, quem navega por teclado continuaria lá no header depois do salto)
export class AnchorNavController {
  private readonly motion: MotionHandle;

  constructor(motion: MotionHandle) {
    this.motion = motion;
  }

  mount(): void {
    document.addEventListener('click', this.onClick);
  }

  destroy(): void {
    document.removeEventListener('click', this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-nav-link]');
    if (!link || link.origin !== location.origin || link.pathname !== location.pathname) return;
    const target = this.resolve(link.hash);
    if (!target) return;

    event.preventDefault();
    this.motion.scrollTo(target);
    history.replaceState(null, '', link.hash);
    this.focus(target);
  };

  private resolve(hash: string): HTMLElement | null {
    if (hash.length < 2) return null;
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  }

  private focus(target: HTMLElement): void {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}
