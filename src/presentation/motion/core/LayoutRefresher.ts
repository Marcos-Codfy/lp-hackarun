import { ScrollTrigger } from './gsap';

const SETTLE_MS = 200;

// fontes, imagens e conteúdo dinâmico (equipes, FAQ aberto) mexem na altura: remede tudo
export class LayoutRefresher {
  private lastHeight = 0;
  private timer = 0;
  private readonly observer: ResizeObserver;

  constructor() {
    if ('fonts' in document) void document.fonts.ready.then(() => ScrollTrigger.refresh());
    if (document.readyState === 'complete') this.schedule();
    else window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

    ScrollTrigger.addEventListener('refresh', () => {
      this.lastHeight = document.body.scrollHeight;
    });
    this.observer = new ResizeObserver(() => this.onBodyResize());
    this.observer.observe(document.body);
  }

  destroy(): void {
    this.observer.disconnect();
    window.clearTimeout(this.timer);
  }

  private onBodyResize(): void {
    // o próprio refresh recoloca os pin-spacers com a mesma altura: ignora pra não entrar em loop
    if (Math.abs(document.body.scrollHeight - this.lastHeight) < 2) return;
    this.schedule();
  }

  private schedule(): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (Math.abs(document.body.scrollHeight - this.lastHeight) >= 2) ScrollTrigger.refresh();
    }, SETTLE_MS);
  }
}
