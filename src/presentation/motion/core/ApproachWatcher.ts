import { yieldToMain } from '@presentation/app/BootQueue';

// ~1 tela abaixo e meia acima: o setup roda antes de o elemento aparecer, mesmo rolando rápido.
// (seção com content-visibility só é medida quando o navegador monta ela, ~meia tela antes)
const APPROACH_MARGIN = '50% 0px 100% 0px';

type Setup = () => void;

// avisa uma vez quando o elemento chega perto da tela; sem IntersectionObserver, avisa na hora.
// Uma instância pra página toda: o navegador entrega todos os observers numa tarefa só, então
// observers separados juntavam os setups de vários animadores numa tarefa longa
export class ApproachWatcher {
  private static instance: ApproachWatcher | null = null;
  private readonly pending = new Map<Element, Setup[]>();
  private readonly due: Setup[] = [];
  private draining = false;
  private readonly observer: IntersectionObserver | null =
    'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => this.onEntries(entries), { rootMargin: APPROACH_MARGIN })
      : null;

  static shared(): ApproachWatcher {
    ApproachWatcher.instance ??= new ApproachWatcher();
    return ApproachWatcher.instance;
  }

  // devolve o cancelamento (teardown do animador antes de o elemento chegar)
  watch(el: Element, onNear: Setup): () => void {
    if (!this.observer) {
      ApproachWatcher.safely(onNear);
      return () => undefined;
    }
    const list = this.pending.get(el);
    if (list) list.push(onNear);
    else this.pending.set(el, [onNear]);
    this.observer.observe(el);
    return () => this.cancel(el, onNear);
  }

  private cancel(el: Element, onNear: Setup): void {
    const queued = this.due.indexOf(onNear);
    if (queued >= 0) this.due.splice(queued, 1);
    const list = this.pending.get(el)?.filter((setup) => setup !== onNear);
    if (list && list.length > 0) {
      this.pending.set(el, list);
      return;
    }
    this.pending.delete(el);
    this.observer?.unobserve(el);
  }

  private onEntries(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const list = this.pending.get(entry.target);
      this.pending.delete(entry.target);
      this.observer?.unobserve(entry.target);
      if (list) this.due.push(...list);
    }
    void this.drain();
  }

  // um setup por tarefa: vários elementos chegando juntos (salto por âncora, tela alta) não viram
  // uma tarefa longa. O primeiro roda já, no callback do observer (layout recém-calculado)
  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    for (let run = this.due.shift(); run; run = this.due.shift()) {
      ApproachWatcher.safely(run);
      if (this.due.length > 0) await yieldToMain();
    }
    this.draining = false;
  }

  // um setup que quebra não pode levar junto os outros do mesmo lote
  private static safely(run: Setup): void {
    try {
      run();
    } catch (error) {
      console.error('[motion] deferred setup failed', error);
    }
  }
}
