import type { AppEvents } from '@presentation/app/AppEvents';
import type { EventBus } from '@shared/core/EventBus';
import { qsa } from '@shared/utils/dom';

interface SpyLink {
  link: HTMLAnchorElement;
  // id da seção da LP que acende o link
  section: string;
}

// âncoras da LP e links de página com seção própria aqui (data-nav-spy, ex.: "Equipes" -> #equipes)
const LINKS = '.site-header a[data-nav-link]:is([href^="#"], [data-nav-spy])';

function toSpyLink(link: HTMLAnchorElement): SpyLink {
  return { link, section: link.dataset['navSpy'] ?? link.hash.slice(1) };
}

// marca no menu a seção atual (Observer: escuta scene:enter do motion, não mede scroll de novo).
// Seção sem link próprio (ex.: #npcs, #mentores) acende o link da seção anterior mais próxima
export class NavSpyController {
  private readonly bus: EventBus<AppEvents>;
  private readonly links: SpyLink[];
  private readonly owners = new Map<string, string>();
  private off: (() => void) | null = null;

  constructor(bus: EventBus<AppEvents>) {
    this.bus = bus;
    this.links = qsa<HTMLAnchorElement>(LINKS).map(toSpyLink);
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
    const linked = new Set(this.links.map(({ section }) => section));
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
    for (const { link, section } of this.links) {
      if (sectionId !== null && section === sectionId) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
}
