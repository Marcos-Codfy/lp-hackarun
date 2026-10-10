import type { AppEvents } from '@presentation/app/AppEvents';
import type { EventBus } from '@shared/core/EventBus';
import { qsa } from '@shared/utils/dom';

// marca no menu a seção atual (Observer: escuta scene:enter do motion, não mede scroll de novo).
// Seção sem link próprio (ex.: #npcs, #mentores) acende o link da seção anterior mais próxima
export class NavSpyController {
  private readonly bus: EventBus<AppEvents>;
  private readonly links: HTMLAnchorElement[];
  private readonly owners = new Map<string, string>();
  private off: (() => void) | null = null;

  constructor(bus: EventBus<AppEvents>) {
    this.bus = bus;
    this.links = qsa<HTMLAnchorElement>('.site-header a[data-nav-link][href^="#"]');
  }

  mount(): void {
    if (this.links.length === 0) return;
    this.mapOwners();
    this.off = this.bus.on('scene:enter', ({ sectionId }) => this.mark(this.owners.get(sectionId) ?? null));
  }

  destroy(): void {
    this.off?.();
  }

  // percorre as seções na ordem da página guardando o último id que tem link;
  // o que vem depois do último link (ex.: #inscricao) não herda nada
  private mapOwners(): void {
    const linked = new Set(this.links.map((link) => link.hash.slice(1)));
    let owner: string | null = null;
    let pending: string[] = [];
    for (const section of qsa('main [data-scene][id]')) {
      if (linked.has(section.id)) {
        owner = section.id;
        pending = [];
      } else if (owner) {
        pending.push(section.id);
      }
      if (owner) this.owners.set(section.id, owner);
    }
    // sobrou em pending = seções depois do último link
    pending.forEach((id) => this.owners.delete(id));
  }

  private mark(sectionId: string | null): void {
    for (const link of this.links) {
      const current = sectionId !== null && link.hash === `#${sectionId}`;
      if (current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
}
