import { qsa } from '@shared/utils/dom';

// Os loops infinitos do CSS (fita, brilho dos botões, varredura dos patrocinadores, brilho dos prêmios, pulso do
// contador, feixes da final) seguem rodando quando a seção está a milhares de pixels da tela. Medido no celular
// emulado: cada loop longe da tela força o navegador a refazer a camada da página inteira a CADA quadro, e isso
// consome a thread principal (mais de 40% dela, parado, com a CPU 4x mais lenta) justamente quando o 3D e o scroll
// mais precisam dela.
// Aqui cada seção ganha a classe is-offscreen quando passa de uma tela de distância; o offscreen-motion.css pausa
// os loops dela. Nada muda na tela: o loop é retomado antes de a seção chegar, e a animação continua de onde parou
export class OffscreenMotionController {
  private observer: IntersectionObserver | null = null;

  constructor(private readonly root: ParentNode = document) {}

  mount(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    // uma tela de margem: perto da tela tudo anima como sempre, e o custo só aparece bem longe dela
    this.observer = new IntersectionObserver(this.onChange, { rootMargin: '100% 0px' });
    for (const target of qsa('main > section, .site-footer', this.root)) this.observer.observe(target);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private readonly onChange = (entries: IntersectionObserverEntry[]): void => {
    for (const entry of entries) entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
  };
}
