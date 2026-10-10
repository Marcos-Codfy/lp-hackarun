import type { AppContext } from '@presentation/app/AppContext';

const TARGET = '#inscricao';
const FORM = '[data-registration-form]';
const SETTLE_MS = 140;
const MAX_WAIT_MS = 2600;

// espera o scroll (smooth ou nativo) parar antes de mexer no foco
function whenScrollSettles(done: () => void): void {
  let timer = setTimeout(finish, SETTLE_MS * 2);
  const guard = setTimeout(finish, MAX_WAIT_MS);
  function onScroll() {
    clearTimeout(timer);
    timer = setTimeout(finish, SETTLE_MS);
  }
  function finish() {
    clearTimeout(timer);
    clearTimeout(guard);
    window.removeEventListener('scroll', onScroll);
    done();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
}

// [data-registration-cta]: leva até a inscrição pelo motion, avisa o bus e entrega o foco
export class RegistrationCtaController {
  private readonly ctx: AppContext;
  // true = conseguiu focar o primeiro campo (ele precisa estar na tela)
  private readonly focusEntry: () => boolean;

  constructor(ctx: AppContext, focusEntry: () => boolean) {
    this.ctx = ctx;
    this.focusEntry = focusEntry;
  }

  mount(): void {
    const section = document.querySelector<HTMLElement>(TARGET);
    if (!section) return;
    // captura: roda antes do AnchorNavigator (bubble), que senão levaria o clique do href="#inscricao"
    document.addEventListener('click', (event) => this.onClick(event, section), { capture: true });
  }

  private onClick(event: MouseEvent, section: HTMLElement): void {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const cta =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-registration-cta]') : null;
    if (!cta) return;
    event.preventDefault();
    this.ctx.bus.emit('registration:intent', { source: cta.dataset['registrationCta'] || 'cta' });
    // CTA de fora vai pro começo da seção (o globo carrega lá); o de dentro já vai direto pro formulário
    const form = document.querySelector<HTMLElement>(FORM);
    const target = section.contains(cta) && form ? form : section;
    this.ctx.motion.scrollTo(target, { immediate: this.ctx.reducedMotion });
    history.replaceState(history.state, '', TARGET);
    whenScrollSettles(() => {
      if (this.focusEntry()) return;
      // formulário ainda longe: foco na seção, o próximo Tab segue dali
      if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
      section.focus({ preventScroll: true });
    });
  }
}
