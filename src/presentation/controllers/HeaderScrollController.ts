import { afterNextPaint } from '@presentation/app/BootQueue';

// estados do header pelo scroll (rAF, só mexe no DOM quando muda):
// is-scrolled = vidro aparece; is-tucked = rolando pra baixo longe do topo, a barra recolhe
const SCROLLED_PX = 24;
const TUCK_AFTER_VH = 0.9;
const DIRECTION_PX = 6;
// descida curta sem a pessoa mexer em nada (roda, toque, teclado) é o navegador ajustando a página: uma
// seção adiada que monta (content-visibility) empurra o scroll uns 24 px pra manter o que está na tela.
// Isso não pode recolher o header que a pessoa acabou de trazer de volta
const ADJUST_PX = 30;
const INPUT_WINDOW_MS = 300;
const INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;

export class HeaderScrollController {
  private readonly header: HTMLElement;
  private scheduled = false;
  private scrolled = false;
  private tucked = false;
  private lastY = 0;
  private lastInput = Number.NEGATIVE_INFINITY;

  constructor(header: HTMLElement) {
    this.header = header;
  }

  mount(): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    INPUT_EVENTS.forEach((type) => window.addEventListener(type, this.onInput, { passive: true }));
    // ler scrollY força layout: a 1ª leitura espera um frame (no boot o layout está sujo dos outros passos)
    afterNextPaint(() => {
      this.lastY = window.scrollY;
      this.update();
    });
  }

  destroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    INPUT_EVENTS.forEach((type) => window.removeEventListener(type, this.onInput));
  }

  private readonly onInput = (): void => {
    this.lastInput = Date.now();
  };

  private readonly onScroll = (): void => {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.update();
    });
  };

  private update(): void {
    const y = window.scrollY;
    this.setScrolled(y > SCROLLED_PX);

    const delta = y - this.lastY;
    if (Math.abs(delta) < DIRECTION_PX) return;
    this.lastY = y;
    if (delta > 0 && delta < ADJUST_PX && Date.now() - this.lastInput > INPUT_WINDOW_MS) return;
    // menu aberto nunca recolhe
    const menuOpen = this.header.classList.contains('is-menu-open');
    this.setTucked(!menuOpen && delta > 0 && y > window.innerHeight * TUCK_AFTER_VH);
  }

  private setScrolled(next: boolean): void {
    if (next === this.scrolled) return;
    this.scrolled = next;
    this.header.classList.toggle('is-scrolled', next);
  }

  private setTucked(next: boolean): void {
    if (next === this.tucked) return;
    this.tucked = next;
    this.header.classList.toggle('is-tucked', next);
  }
}
