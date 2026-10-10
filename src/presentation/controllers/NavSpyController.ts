import type { AppEvents } from '@presentation/app/AppEvents';
import type { EventBus } from '@shared/core/EventBus';
import { qsa } from '@shared/utils/dom';

// marca no menu a seção atual (Observer: escuta scene:enter do motion, não mede scroll de novo)
export class NavSpyController {
  private readonly bus: EventBus<AppEvents>;
  private readonly links: HTMLAnchorElement[];
  private off: (() => void) | null = null;

  constructor(bus: EventBus<AppEvents>) {
    this.bus = bus;
    this.links = qsa<HTMLAnchorElement>('.site-header a[data-nav-link][href^="#"]');
  }

  mount(): void {
    if (this.links.length === 0) return;
    this.off = this.bus.on('scene:enter', ({ sectionId }) => this.mark(sectionId));
  }

  destroy(): void {
    this.off?.();
  }

  private mark(sectionId: string): void {
    for (const link of this.links) {
      const current = link.hash === `#${sectionId}`;
      if (current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
}
