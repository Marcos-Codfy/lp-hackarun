// link da página em que a pessoa já está (aria-current="page": "Inscrição" em /inscricao, "Equipes" em
// /equipes): em vez de recarregar e perder o que foi digitado, sobe pro começo do conteúdo
// a hospedagem pode servir /inscricao como /inscricao/ (pasta com index.html): a barra final não conta
const path = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

export function isSamePageLink(link: HTMLAnchorElement, here: Location = location): boolean {
  if (link.getAttribute('aria-current') !== 'page' || link.target === '_blank') return false;
  try {
    const url = new URL(link.href, here.href);
    return url.origin === here.origin && path(url.pathname) === path(here.pathname) && url.hash === '';
  } catch {
    return false;
  }
}

export class CurrentPageLinks {
  constructor(private readonly reducedMotion: boolean) {}

  mount(): void {
    document.addEventListener('click', this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link || !isSamePageLink(link)) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: this.reducedMotion ? 'instant' : 'smooth' });
    // o foco acompanha a tela: o próximo Tab segue do começo do conteúdo, não do rodapé
    const main = document.getElementById('conteudo');
    if (!main) return;
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  };
}
