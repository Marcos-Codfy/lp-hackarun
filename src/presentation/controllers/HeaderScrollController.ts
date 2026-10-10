// header ganha o vidro depois de rolar um pouco; rAF pra não fazer trabalho a cada evento de scroll
const THRESHOLD_PX = 24;

export class HeaderScrollController {
  private readonly header: HTMLElement;
  private scheduled = false;
  private scrolled = false;

  constructor(header: HTMLElement) {
    this.header = header;
  }

  mount(): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.update();
  }

  destroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  private readonly onScroll = (): void => {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.update();
    });
  };

  private update(): void {
    const next = window.scrollY > THRESHOLD_PX;
    // só mexe no DOM quando o estado muda de fato
    if (next === this.scrolled) return;
    this.scrolled = next;
    this.header.classList.toggle('is-scrolled', next);
  }
}
