// Enquanto a página rola, os loops decorativos do CSS (deriva da aurora, brilho dos botões, fita, pulso do contador...)
// ficam parados. Medido no celular emulado (CPU 4x, rolagem de ponta a ponta): com TODAS as animações de CSS desligadas
// os quadros acima de 25 ms caem de cerca de 53% para 27%; desligar só a aurora ou só o resto rende bem menos. Um loop
// qualquer rodando mantém o navegador produzindo quadro e refazendo estilo a cada 16 ms, justamente quando o scroll
// precisa da thread principal.
// Aqui a raiz ganha a classe is-scrolling enquanto chegam eventos de scroll e a perde um instante depois do último;
// o scroll-motion.css pausa os loops. Nada muda na tela: os loops são lentos e continuam de onde pararam.
const SCROLLING_CLASS = 'is-scrolling';
// depois do último scroll (o dedo parado ou a inércia acabando) os loops voltam
const IDLE_MS = 160;

export class ScrollMotionController {
  private timer = 0;
  private scrolling = false;

  constructor(
    private readonly root: HTMLElement = document.documentElement,
    private readonly target: Window = window,
  ) {}

  mount(): void {
    this.target.addEventListener('scroll', this.onScroll, { passive: true });
  }

  destroy(): void {
    this.target.removeEventListener('scroll', this.onScroll);
    clearTimeout(this.timer);
    this.settle();
  }

  private readonly onScroll = (): void => {
    // um evento por quadro: só mexe na classe na primeira vez
    if (!this.scrolling) {
      this.scrolling = true;
      this.root.classList.add(SCROLLING_CLASS);
    }
    clearTimeout(this.timer);
    this.timer = window.setTimeout(this.settle, IDLE_MS);
  };

  private readonly settle = (): void => {
    this.scrolling = false;
    this.root.classList.remove(SCROLLING_CLASS);
  };
}
