// carrega o chunk de uma parte da página (e monta) só quando ela importa: o alvo chega perto da tela
// (com folga de duas telas: a rede precisa de tempo), a página abre ou salta pra ele (/#id, link pro
// #id), a pessoa foca ou toca nele antes disso, ou alguém pede direto (CTA). Roda uma vez; se o
// carregamento falhar, o próximo gatilho tenta de novo
const LOAD_MARGIN = '100% 0px 200% 0px';
const INTERACTIONS = ['focusin', 'pointerdown'] as const;

export class LazyMount {
  private loading: Promise<void> | null = null;
  private done = false;
  private observer: IntersectionObserver | null = null;
  private readonly target: HTMLElement;
  private readonly load: () => Promise<void>;
  private readonly onInteract = (): void => this.trigger();
  private readonly onLinkClick = (event: Event): void => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (link && this.target.id && link.hash === `#${this.target.id}`) this.trigger();
  };

  // target: o que é observado (em seção com content-visibility, a própria seção: o miolo só ganha
  // caixa quando o navegador monta ela, meia tela antes)
  constructor(target: HTMLElement, load: () => Promise<void>) {
    this.target = target;
    this.load = load;
  }

  watch(): void {
    if (!('IntersectionObserver' in window)) {
      this.trigger();
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.trigger();
      },
      { rootMargin: LOAD_MARGIN },
    );
    this.observer.observe(this.target);
    INTERACTIONS.forEach((type) =>
      this.target.addEventListener(type, this.onInteract, { capture: true, passive: true }),
    );
    // salto direto (âncora, menu) com scroll imediato: começa a baixar no clique, não na chegada
    document.addEventListener('click', this.onLinkClick, { capture: true, passive: true });
    if (this.isHashTarget()) this.trigger();
  }

  trigger(): void {
    void this.ensure().catch((error: unknown) => console.error('[lazy] mount failed', error));
  }

  // carrega (se ainda não) e resolve quando montou; quem depende disto espera aqui
  ensure(): Promise<void> {
    this.loading ??= this.load().then(
      () => {
        this.done = true;
        this.stop();
      },
      (error: unknown) => {
        this.loading = null;
        throw error;
      },
    );
    return this.loading;
  }

  get loaded(): boolean {
    return this.done;
  }

  private isHashTarget(): boolean {
    return this.target.id !== '' && location.hash === `#${this.target.id}`;
  }

  private stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    INTERACTIONS.forEach((type) => this.target.removeEventListener(type, this.onInteract, { capture: true }));
    document.removeEventListener('click', this.onLinkClick, { capture: true });
  }
}
