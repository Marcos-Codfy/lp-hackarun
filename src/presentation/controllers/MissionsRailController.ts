import { qs, qsa } from '@shared/utils/dom';

// trilho de deslizar das missões no celular (scroll-snap nativo do CSS). Aqui só o que o CSS não faz:
// liga o contador 01/08 e a barra ao scroll e deixa o trilho focável pra rolar com as setas do teclado.
// Só vale enquanto o trilho rola de fato: na grade (640px+) e no trilho preso do desktop fica tudo de fora
export class MissionsRailController {
  private readonly section: HTMLElement;
  private readonly track: HTMLElement | null;
  private readonly cards: HTMLElement[];
  private readonly current: HTMLElement | null;
  private readonly bar: HTMLElement | null;
  private active = false;
  private frame = 0;
  private shown = -1;

  constructor(section: HTMLElement) {
    this.section = section;
    this.track = qs('[data-missions-track]', section);
    this.cards = this.track ? qsa('[data-station]', this.track) : [];
    this.current = qs('[data-missions-current]', section);
    this.bar = qs('[data-missions-bar]', section);
  }

  mount(): void {
    if (!this.track || this.cards.length < 2) return;
    this.track.addEventListener('scroll', this.schedule, { passive: true });
    // a 1ª medida também vem do observer (logo depois do próximo layout), sem forçar layout no boot
    new ResizeObserver(() => this.check()).observe(this.track);
  }

  private check(): void {
    const track = this.track as HTMLElement;
    const rail =
      track.scrollWidth - track.clientWidth > 1 && !this.section.classList.contains('is-horizontal');
    if (rail === this.active) {
      if (rail) this.render();
      return;
    }
    this.active = rail;
    this.section.classList.toggle('is-rail', rail);
    if (rail) {
      track.tabIndex = 0;
      this.shown = -1;
      this.render();
    } else {
      track.removeAttribute('tabindex');
      this.bar?.style.removeProperty('transform');
    }
  }

  private readonly schedule = (): void => {
    if (!this.active || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  };

  private render(): void {
    // lê tudo antes de escrever: card que encosta no começo do trilho (no fim do scroll, o último)
    const track = this.track as HTMLElement;
    const max = track.scrollWidth - track.clientWidth;
    const progress = max > 0 ? Math.min(1, Math.max(0, track.scrollLeft / max)) : 0;
    const last = this.cards.length - 1;
    const pitch = (this.cards[1]?.offsetLeft ?? 0) - (this.cards[0]?.offsetLeft ?? 0);
    const index =
      progress > 0.995 ? last : pitch > 0 ? Math.min(last, Math.round(track.scrollLeft / pitch)) : 0;
    if (this.bar) this.bar.style.transform = `scaleX(${progress.toFixed(3)})`;
    if (index === this.shown || !this.current) return;
    this.shown = index;
    this.current.textContent = String(index + 1).padStart(2, '0');
  }
}
