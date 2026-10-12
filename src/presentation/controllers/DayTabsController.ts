import { qs, qsa } from '@shared/utils/dom';

const DESKTOP = '(min-width: 1024px)';
const PREV = new Set(['ArrowLeft', 'ArrowUp']);
const NEXT = new Set(['ArrowRight', 'ArrowDown']);

// "AAAA-MM-DD" de hoje no fuso do evento (o dia em curso abre selecionado)
export function isoDateIn(timeZone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// padrão de abas da WAI-ARIA na programação. O HTML chega com os dias empilhados (funciona sem JS);
// aqui vira tablist + tabpanel, com tabindex móvel, setas (as quatro), Home/End e ativação automática
export class DayTabsController {
  private readonly root: HTMLElement;
  private readonly today: string | null;
  private tabs: HTMLButtonElement[] = [];
  private panels: HTMLElement[] = [];
  private tablist: HTMLElement | null = null;

  constructor(root: HTMLElement, options: { today?: string | null } = {}) {
    this.root = root;
    this.today = options.today ?? null;
  }

  mount(): void {
    this.tablist = qs('[data-day-tablist]', this.root);
    this.tabs = qsa<HTMLButtonElement>('[data-day-tab]', this.root);
    this.panels = this.tabs
      .map((tab) => qs(`#${tab.dataset['dayTab'] ?? ''}`, this.root))
      .filter(Boolean) as HTMLElement[];
    // aba sem painel (ou painel sem aba): fica tudo empilhado, que é o estado seguro
    if (!this.tablist || this.tabs.length < 2 || this.panels.length !== this.tabs.length) return;

    this.tablist.setAttribute('role', 'tablist');
    this.tablist.setAttribute('aria-label', 'Dias da programação');
    this.tabs.forEach((tab, i) => {
      const panel = this.panels[i] as HTMLElement;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
    });
    this.watchOrientation();
    this.select(this.initialIndex());
    this.tablist.hidden = false;
    this.root.classList.add('is-tabbed');

    this.tablist.addEventListener('click', this.onClick);
    this.tablist.addEventListener('keydown', this.onKeydown);
    window.addEventListener('hashchange', this.onHashChange);
  }

  get selectedIndex(): number {
    return this.tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
  }

  select(index: number, focus = false): void {
    this.tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      (this.panels[i] as HTMLElement).hidden = !selected;
    });
    if (focus) this.tabs[index]?.focus();
  }

  // link pra um dia (/#dia-14) abre a aba dele; senão o dia em curso; senão o 1º
  private initialIndex(): number {
    const byHash = this.indexOfHash(location.hash);
    if (byHash >= 0) return byHash;
    const today = this.tabs.findIndex((tab) => tab.dataset['date'] === this.today);
    return Math.max(0, today);
  }

  private indexOfHash(hash: string): number {
    return hash.length > 1 ? this.tabs.findIndex((tab) => `#${tab.dataset['dayTab'] ?? ''}` === hash) : -1;
  }

  // hash trocado com a página aberta: o navegador não rola até painel escondido, então mostra e leva até ele
  private readonly onHashChange = (): void => {
    const index = this.indexOfHash(location.hash);
    if (index < 0 || index === this.selectedIndex) return;
    this.select(index);
    this.panels[index]?.scrollIntoView?.({ block: 'start' });
  };

  private readonly onClick = (event: MouseEvent): void => {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[data-day-tab]');
    const index = tab ? this.tabs.indexOf(tab) : -1;
    if (index >= 0) this.select(index);
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    const current = this.tabs.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    const last = this.tabs.length - 1;
    let next: number | null = null;
    if (PREV.has(event.key)) next = current === 0 ? last : current - 1;
    else if (NEXT.has(event.key)) next = current === last ? 0 : current + 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    this.select(next, true);
  };

  // abas em linha no celular, em coluna no desktop: o aria-orientation acompanha
  private watchOrientation(): void {
    const tablist = this.tablist;
    if (!tablist || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DESKTOP);
    const apply = () => tablist.setAttribute('aria-orientation', media.matches ? 'vertical' : 'horizontal');
    apply();
    media.addEventListener('change', apply);
  }
}
