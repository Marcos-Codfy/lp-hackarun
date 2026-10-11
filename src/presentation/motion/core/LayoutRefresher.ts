import { afterNextPaint } from '@presentation/app/BootQueue';
import { ScrollTrigger } from './gsap';

const SETTLE_MS = 200;

// fontes, imagens e conteúdo dinâmico (equipes, FAQ aberto) mexem na altura: remede tudo.
// Refresh completo custa caro: só quando algo pode ter mudado de fato, e a conferência da altura
// roda logo depois de um frame (ler scrollHeight com o layout sujo forçava um layout inteiro)
export class LayoutRefresher {
  // -1 = ainda sem base: o 1º aviso do observer só registra a altura
  private lastHeight = -1;
  private timer = 0;
  private force = false;
  private readonly observer: ResizeObserver;

  constructor() {
    // fonte que já tinha chegado não muda nada: os gatilhos nascem medindo a página pronta
    if ('fonts' in document && document.fonts.status === 'loading') {
      void document.fonts.ready.then(() => this.schedule(true));
    }
    // load (imagens): refaz só se a altura mudou; as imagens têm width/height, quase nunca muda
    if (document.readyState === 'complete') this.schedule();
    else window.addEventListener('load', () => this.schedule(), { once: true });

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

  // o observer avisa depois do layout: aqui a leitura sai de graça
  private onBodyResize(): void {
    const height = document.body.scrollHeight;
    if (this.lastHeight < 0) {
      this.lastHeight = height;
      return;
    }
    // o próprio refresh recoloca os pin-spacers com a mesma altura: ignora pra não entrar em loop
    if (Math.abs(height - this.lastHeight) >= 2) this.schedule();
  }

  // force: troca de fonte pode mexer nas quebras sem mudar a altura total
  private schedule(force = false): void {
    this.force ||= force;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => afterNextPaint(() => this.check()), SETTLE_MS);
  }

  private check(): void {
    const changed = this.lastHeight < 0 || Math.abs(document.body.scrollHeight - this.lastHeight) >= 2;
    if (changed || this.force) ScrollTrigger.refresh();
    this.force = false;
  }
}
