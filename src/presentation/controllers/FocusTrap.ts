const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// mantém o Tab circulando dentro das regiões dadas (ex.: botão de fechar + painel do menu)
export class FocusTrap {
  private readonly regions: HTMLElement[];

  constructor(regions: HTMLElement[]) {
    this.regions = regions;
  }

  first(): HTMLElement | null {
    return this.items()[0] ?? null;
  }

  handle(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = this.items();
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;

    const active = document.activeElement;
    const inside = items.some((el) => el === active);
    if (event.shiftKey && (active === first || !inside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !inside)) {
      event.preventDefault();
      first.focus();
    }
  }

  private items(): HTMLElement[] {
    return this.regions
      .flatMap((region) =>
        region.matches(FOCUSABLE) ? [region] : [...region.querySelectorAll<HTMLElement>(FOCUSABLE)],
      )
      .filter((el) => !el.closest('[hidden]') && el.getClientRects().length > 0);
  }
}
