import type { AppContext } from '@presentation/app/AppContext';

// segurança caso o 'charged' nunca chegue (saiu no meio da carga, gatilho quebrado)
const AFTER_CHARGING_MS = 2500;
const AFTER_IN_VIEW_MS = 6000;

// pico-fim no #inscricao: o CTA fica apagado até o globo carregar; a barra enche no tempo da carga
// (--charge-ms) e timers garantem que nunca fica preso
export class ChargeRevealView {
  private readonly ctx: AppContext;
  private readonly section: HTMLElement;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private readonly offs: (() => void)[] = [];
  private observer: IntersectionObserver | null = null;
  private done = false;

  constructor(ctx: AppContext, section: HTMLElement) {
    this.ctx = ctx;
    this.section = section;
  }

  mount(): void {
    if (!this.ctx.reducedMotion) this.section.classList.add('is-awaiting-charge');
    this.offs.push(
      this.ctx.bus.on('experience:charged', () => this.reveal()),
      this.ctx.bus.on('experience:charging', ({ durationMs }) => this.charging(durationMs)),
    );
    if (!('IntersectionObserver' in window)) {
      this.fallbackIn(AFTER_IN_VIEW_MS);
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.observer?.disconnect();
        this.fallbackIn(AFTER_IN_VIEW_MS);
      },
      { threshold: 0.2 },
    );
    this.observer.observe(this.section);
  }

  private charging(durationMs: number): void {
    if (this.done) return;
    this.section.style.setProperty('--charge-ms', `${durationMs}ms`);
    this.section.classList.add('is-charging');
    this.fallbackIn(durationMs + AFTER_CHARGING_MS);
  }

  // o que vier primeiro ganha: evento real ou um dos timers
  private fallbackIn(ms: number): void {
    if (!this.done) this.timers.push(setTimeout(() => this.reveal(), ms));
  }

  private reveal(): void {
    if (this.done) return;
    this.done = true;
    this.timers.forEach(clearTimeout);
    this.offs.forEach((off) => off());
    this.observer?.disconnect();
    this.section.classList.remove('is-awaiting-charge', 'is-charging');
    this.section.classList.add('is-charged');
  }
}
