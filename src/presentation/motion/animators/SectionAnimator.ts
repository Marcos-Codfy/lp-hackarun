import { gsap } from '@presentation/motion/core/gsap';
import { ApproachWatcher } from '@presentation/motion/core/ApproachWatcher';
import type { AppContext } from '@presentation/app/AppContext';
import { afterNextPaint, timed } from '@presentation/app/BootQueue';
import { qsa } from '@shared/utils/dom';
import { unveil, veil } from './veil';

// Template Method: o ciclo de vida (achar elementos, escolher modo, limpar) fica aqui;
// cada animador só diz o seletor e como animar um elemento
export abstract class SectionAnimator {
  protected abstract readonly selector: string;
  private scope: gsap.Context | null = null;
  private readonly cancels: (() => void)[] = [];
  private readonly veiled: HTMLElement[] = [];
  private alive = true;

  // nome legível no boot (o nome da classe some no build minificado)
  get label(): string {
    return this.selector;
  }

  mount(ctx: AppContext): void {
    const elements = qsa(this.selector);
    if (elements.length === 0) return;
    this.alive = true;
    this.scope = gsap.context(() => {
      for (const el of elements) {
        if (ctx.reducedMotion) this.setupReduced(el, ctx);
        else this.setup(el, ctx);
      }
    });
  }

  teardown(): void {
    this.alive = false;
    this.cancels.splice(0).forEach((cancel) => cancel());
    this.scope?.revert();
    this.scope = null;
    unveil(this.veiled.splice(0));
  }

  // false depois do teardown: setup atrasado (frame, idle, import) confere antes de montar
  protected get active(): boolean {
    return this.alive;
  }

  protected abstract setup(el: HTMLElement, ctx: AppContext): void;

  // padrão em reduced motion: não anima (o conteúdo já está visível no HTML)
  protected setupReduced(_el: HTMLElement, _ctx: AppContext): void {}

  // pra coisas criadas depois (ex.: fontes carregadas) continuarem dentro do revert
  protected later(fn: () => void): void {
    if (this.scope) this.scope.add(fn);
    else fn();
  }

  // o setup pesado (tweens, gatilhos que medem a página) só roda quando o elemento chega perto
  // da tela; até lá `hidden` fica com o véu barato. O véu sai antes do setup: se ele quebrar,
  // o conteúdo aparece em vez de sumir
  protected whenNear(el: Element, setup: () => void, hidden: readonly HTMLElement[] = []): void {
    veil(hidden);
    this.veiled.push(...hidden);
    const cancel = ApproachWatcher.shared().watch(el, () => {
      unveil(hidden);
      timed(`near:${this.label}`, () => this.later(setup));
    });
    this.cancels.push(cancel);
  }

  // setup que lê estilo/layout logo depois de um frame (layout limpo), numa tarefa só dele:
  // no meio do boot o mesmo getComputedStyle recalculava a página inteira
  protected afterPaint(name: string, setup: () => void): void {
    afterNextPaint(() => {
      if (!this.alive) return;
      try {
        timed(`paint:${name}`, () => this.later(setup));
      } catch (error) {
        console.error(`[animators] ${name} failed`, error);
      }
    });
  }

  // gatilho padrão das entradas: dispara uma vez quando o topo passa de 85% da tela
  protected entrance(trigger: Element, start = 'top 85%'): ScrollTrigger.Vars {
    return { trigger, start, once: true };
  }
}
