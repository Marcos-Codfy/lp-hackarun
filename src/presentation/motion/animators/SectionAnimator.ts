import { gsap } from '@presentation/motion/core/gsap';
import type { AppContext } from '@presentation/app/AppContext';
import { qsa } from '@shared/utils/dom';

// Template Method: o ciclo de vida (achar elementos, escolher modo, limpar) fica aqui;
// cada animador só diz o seletor e como animar um elemento
export abstract class SectionAnimator {
  protected abstract readonly selector: string;
  private scope: gsap.Context | null = null;

  mount(ctx: AppContext): void {
    const elements = qsa(this.selector);
    if (elements.length === 0) return;
    this.scope = gsap.context(() => {
      for (const el of elements) {
        if (ctx.reducedMotion) this.setupReduced(el, ctx);
        else this.setup(el, ctx);
      }
    });
  }

  teardown(): void {
    this.scope?.revert();
    this.scope = null;
  }

  protected abstract setup(el: HTMLElement, ctx: AppContext): void;

  // padrão em reduced motion: não anima (o conteúdo já está visível no HTML)
  protected setupReduced(_el: HTMLElement, _ctx: AppContext): void {}

  // pra coisas criadas depois (ex.: fontes carregadas) continuarem dentro do revert
  protected later(fn: () => void): void {
    if (this.scope) this.scope.add(fn);
    else fn();
  }

  // gatilho padrão das entradas: dispara uma vez quando o topo passa de 85% da tela
  protected entrance(trigger: Element, start = 'top 85%'): ScrollTrigger.Vars {
    return { trigger, start, once: true };
  }
}
