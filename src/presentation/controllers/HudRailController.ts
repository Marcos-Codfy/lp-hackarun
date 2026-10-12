import { qs, qsa } from '@shared/utils/dom';

interface Tick {
  el: HTMLElement;
  // posição 0..1 no progresso da página em que a seção chega ao meio da tela
  at: number;
}

const START_RATIO = 0.6;
// celular: a pílula some rolando pra baixo e volta ao subir ou depois de um tempo parado
const IDLE_MS = 1200;
const DIRECTION_PX = 6;

// desenha um tique por checkpoint no trilho do HUD e marca passados/atual pelo scroll; no celular, tira a
// pílula da frente do texto (o texto, a barra e os NPCs continuam com a HudView)
export class HudRailController {
  private readonly root: HTMLElement;
  private readonly sections: HTMLElement[];
  private ticks: Tick[] = [];
  private current = -2;
  private frame = 0;
  private lastY = 0;
  private tucked = false;
  private idle = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.sections = qsa('[data-checkpoint]');
  }

  mount(): void {
    // a pílula fica por cima do texto do rodapé ("© 2026 HackaRun") e dos erros do formulário: some ali
    this.hideOver('.site-footer', 'is-footer');
    this.hideOver('#inscricao-lobby', 'is-form');
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

  // marca a classe enquanto o alvo está na tela (o desktop ignora: lá o HUD é o trilho da borda)
  private hideOver(selector: string, className: string): void {
    const target = qs(selector);
    if (!target || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([entry]) => {
      this.root.classList.toggle(className, entry?.isIntersecting ?? false);
    }).observe(target);
  }

  // mesma lógica do header: rolando pra baixo recolhe; subindo, ou ~1,2 s parado, volta
  private tuck(scrollY: number): void {
    const delta = scrollY - this.lastY;
    if (Math.abs(delta) < DIRECTION_PX) return;
    this.lastY = scrollY;
    this.setTucked(delta > 0);
    window.clearTimeout(this.idle);
    if (delta > 0) this.idle = window.setTimeout(() => this.setTucked(false), IDLE_MS);
  }

  private setTucked(next: boolean): void {
    if (next === this.tucked) return;
    this.tucked = next;
    this.root.classList.toggle('is-tucked', next);
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
        const scrollY = window.scrollY;
        this.tuck(scrollY);
        this.render(scrollY, document.documentElement.scrollHeight - window.innerHeight);
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
