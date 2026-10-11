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
    // pins e conteúdo carregado depois mudam a altura da página. A 1ª medida também vem daqui
    // (o observer avisa logo depois do próximo layout): ler agora forçaria um layout no boot
    new ResizeObserver(this.remeasure).observe(document.body);
  }

  // tudo que mede antes de qualquer escrita: ler e escrever alternado recalculava o estilo a cada tique
  private readonly remeasure = (): void => {
    const scrollY = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const half = window.innerHeight / 2;
    const tops = this.sections.map((section) => section.getBoundingClientRect().top + scrollY);
    this.ticks.forEach((tick, index) => {
      const top = tops[index];
      if (top === undefined) return;
      const at = max > 0 ? Math.min(1, Math.max(0, (top - half) / max)) : 0;
      if (at === tick.at && tick.el.style.getPropertyValue('--p')) return;
      tick.at = at;
      tick.el.style.setProperty('--p', at.toFixed(4));
    });
    this.current = -2;
    this.render(scrollY, max);
  };

  private readonly schedule = (): void => {
    if (!this.frame) {
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.render(window.scrollY, document.documentElement.scrollHeight - window.innerHeight);
      });
    }
  };

  private render(scrollY: number, max: number): void {
    const progress = max > 0 ? scrollY / max : 0;
    this.root.classList.toggle('is-start', scrollY < window.innerHeight * START_RATIO);

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
