import type { ScrollDriver } from './ScrollDriver';

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

// links "#secao" da própria página: rola com o driver, atualiza o hash sem pulo e leva o foco junto
export class AnchorNavigator {
  constructor(private readonly driver: ScrollDriver) {
    document.addEventListener('click', this.onClick);
  }

  destroy(): void {
    document.removeEventListener('click', this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('a[href^="#"]');
    if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return;

    const hash = link.getAttribute('href') ?? '';
    const id = decodeURIComponent(hash.slice(1));
    const section = id ? document.getElementById(id) : null;
    // alvo inexistente: deixa o navegador decidir
    if (!section) return;

    event.preventDefault();
    this.driver.scrollTo(section, { onComplete: () => focusSection(section) });
    history.replaceState(history.state, '', `#${encodeURIComponent(id)}`);
  };
}

// leitor de tela e teclado continuam do ponto certo depois da rolagem
function focusSection(section: HTMLElement): void {
  if (!section.matches(FOCUSABLE)) section.setAttribute('tabindex', '-1');
  section.focus({ preventScroll: true });
}
