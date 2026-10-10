import type { AppContext } from '@presentation/app/AppContext';
import type { SoundViewModel } from '@presentation/view-models/sound/SoundViewModel';

const AFTER_CHARGING_MS = 4000;
const AFTER_IN_VIEW_MS = 6000;

// pico-fim no #inscricao: o lobby fica apagado até o globo carregar; timers garantem que nunca fica preso
export class ChargeRevealView {
  private readonly ctx: AppContext;
  private readonly sound: SoundViewModel;
  private readonly section: HTMLElement;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private readonly offs: (() => void)[] = [];
  private observer: IntersectionObserver | null = null;
  private done = false;

  constructor(ctx: AppContext, sound: SoundViewModel, section: HTMLElement) {
    this.ctx = ctx;
    this.sound = sound;
    this.section = section;
  }

  mount(): void {
    if (!this.ctx.reducedMotion) this.section.classList.add('is-awaiting-charge');
    this.offs.push(
      this.ctx.bus.on('experience:charged', () => this.reveal()),
      this.ctx.bus.on('experience:charging', () => this.fallbackIn(AFTER_CHARGING_MS)),
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
    this.section.classList.remove('is-awaiting-charge');
    this.section.classList.add('is-charged');
    this.sound.playCue();
  }
}
