// abre a pergunta do FAQ que o endereço aponta (/#faq-teams): na chegada e quando o hash muda sem o
// AnchorNavigator (clique antes da animação carregar, endereço colado). Quem passa pelo AnchorNavigator já
// chega com a pergunta aberta; abrir de novo não muda nada
export class FaqHashController {
  mount(): void {
    window.addEventListener('hashchange', this.open);
    this.open();
  }

  private readonly open = (): void => {
    const entry = FaqHashController.entryOf(location.hash);
    if (entry) entry.open = true;
  };

  private static entryOf(hash: string): HTMLDetailsElement | null {
    if (!hash.startsWith('#faq-')) return null;
    try {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      return el instanceof HTMLDetailsElement ? el : null;
    } catch {
      return null;
    }
  }
}
