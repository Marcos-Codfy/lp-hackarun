import { qs, qsa } from '@shared/utils/dom';

interface Tick {
  el: HTMLElement;
  // posição 0..1 no progresso da página em que a seção chega ao meio da tela
  at: number;
}

const START_RATIO = 0.6;

// desenha um tique por checkpoint no trilho do HUD e marca passados/atual pelo scroll
// (o texto, a barra e os NPCs continuam com a HudView; aqui é só a régua)
export class HudRailController {
  private readonly root: HTMLElement;
  private readonly sections: HTMLElement[];
  private ticks: Tick[] = [];
  private current = -2;
  private frame = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.sections = qsa('[data-checkpoint]');
  }

  mount(): void {
    const host = qs('[data-hud-ticks]', this.root);
    if (!host || this.sections.length === 0) return;
    this.ticks = this.sections.map(() => {
      const el = document.createElement('span');
      el.className = 'hud__tick';
      host.append(el);
      return { el, at: 0 };
    });
    window.addEventListener('scroll', this.schedule, { passive: true });
    window.addEventListener('resize', this.remeasure, { passive: true });
    // pins e conteúdo carregado depois mudam a altura da página
    new ResizeObserver(this.remeasure).observe(document.body);
    this.remeasure();
  }

  private readonly remeasure = (): void => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const half = window.innerHeight / 2;
    this.ticks.forEach((tick, index) => {
      const section = this.sections[index];
      if (!section) return;
      const top = section.getBoundingClientRect().top + window.scrollY;
      tick.at = max > 0 ? Math.min(1, Math.max(0, (top - half) / max)) : 0;
      tick.el.style.setProperty('--p', tick.at.toFixed(4));
    });
    this.current = -2;
    this.update();
  };

  private readonly schedule = (): void => {
    if (!this.frame) this.frame = requestAnimationFrame(() => this.update());
  };

  private update(): void {
    this.frame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    this.root.classList.toggle('is-start', window.scrollY < window.innerHeight * START_RATIO);

    let current = -1;
    this.ticks.forEach((tick, index) => {
      if (tick.at <= progress + 0.002) current = index;
    });
    if (current === this.current) return;
    this.current = current;
    this.ticks.forEach((tick, index) => {
      tick.el.classList.toggle('is-passed', index <= current);
      tick.el.classList.toggle('is-current', index === current);
    });
  }
}
