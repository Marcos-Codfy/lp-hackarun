import type { MotionHandle } from '@presentation/app/AppContext';
import { FocusTrap } from './FocusTrap';
import { ScrollLock } from './ScrollLock';

interface MobileMenuDeps {
  header: HTMLElement;
  toggle: HTMLButtonElement;
  panel: HTMLElement;
  motion: MotionHandle;
}

const DESKTOP_QUERY = '(min-width: 1024px)';

// menu mobile em tela cheia: aria-expanded, Esc fecha, foco volta pro botão e o resto da página fica inert
export class MobileMenuController {
  private readonly header: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly lock: ScrollLock;
  private readonly trap: FocusTrap;
  private readonly inerted: HTMLElement[] = [];
  private isOpen = false;

  constructor(deps: MobileMenuDeps) {
    this.header = deps.header;
    this.toggle = deps.toggle;
    this.panel = deps.panel;
    this.lock = new ScrollLock(deps.motion);
    this.trap = new FocusTrap([deps.header]);
  }

  mount(): void {
    this.toggle.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    // link clicado: fecha sem devolver o foco (quem navega cuida do foco no destino)
    this.panel.addEventListener('click', (event) => {
      if ((event.target as Element).closest('a[href]')) this.close({ restoreFocus: false });
    });
    window.matchMedia(DESKTOP_QUERY).addEventListener('change', (event) => {
      if (event.matches) this.close({ restoreFocus: false });
    });
    // saiu da página com o menu aberto (gesto de voltar): quem volta pelo bfcache não acha a tela travada
    window.addEventListener('pagehide', () => this.close({ restoreFocus: false }));
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.panel.hidden = false;
    this.setExpanded(true);
    this.lock.lock();
    this.setBackgroundInert(true);
    document.addEventListener('keydown', this.onKeydown);
    this.panel.querySelector<HTMLElement>('a[href]')?.focus();
  }

  close({ restoreFocus = true }: { restoreFocus?: boolean } = {}): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panel.hidden = true;
    this.setExpanded(false);
    this.setBackgroundInert(false);
    this.lock.unlock();
    document.removeEventListener('keydown', this.onKeydown);
    if (restoreFocus) this.toggle.focus();
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    this.trap.handle(event);
  };

  private setExpanded(expanded: boolean): void {
    this.toggle.setAttribute('aria-expanded', String(expanded));
    this.header.classList.toggle('is-menu-open', expanded);
    const label = this.toggle.querySelector('[data-menu-label]');
    if (label) label.textContent = expanded ? 'Fechar menu' : 'Abrir menu';
  }

  // tudo que não é o header sai da navegação por teclado e do leitor de tela
  private setBackgroundInert(inert: boolean): void {
    if (!inert) {
      this.inerted.splice(0).forEach((el) => (el.inert = false));
      return;
    }
    for (const el of Array.from(document.body.children)) {
      if (!(el instanceof HTMLElement) || el.contains(this.header) || el.inert) continue;
      el.inert = true;
      this.inerted.push(el);
    }
  }
}
