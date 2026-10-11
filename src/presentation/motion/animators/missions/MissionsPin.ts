import { gsap, ScrollTrigger } from '@presentation/motion/core/gsap';
import { yieldToMain } from '@presentation/app/BootQueue';
import { clamp } from '@shared/utils/math';
import { qs, qsa } from '@shared/utils/dom';

// o refresh global (obrigatório depois de um pin) vai pra próxima tarefa: criar e medir juntos passava
// de 100 ms. Se um frame entrar no meio, o refresh que o próprio pin agenda resolve e este pula
function refreshSoon(): void {
  let refreshed = false;
  const mark = (): void => {
    refreshed = true;
  };
  ScrollTrigger.addEventListener('refresh', mark);
  void yieldToMain().then(() => {
    ScrollTrigger.removeEventListener('refresh', mark);
    if (!refreshed) ScrollTrigger.refresh();
  });
}

// trilho horizontal das missões preso (pin) andando com o scroll vertical; contador e barra acompanham
export class MissionsPin {
  private readonly cards: HTMLElement[];
  private readonly current: HTMLElement | null;
  private readonly bar: HTMLElement | null;
  // spacer nosso: com o gerado o ScrollTrigger tira e põe o pin no DOM a cada refresh (a seção refaz
  // estilo e layout do zero duas vezes por refresh); com um nativo ele só troca estilos
  private readonly spacer = document.createElement('div');
  private timeline: gsap.core.Timeline | null = null;
  private shown = -1;

  constructor(
    section: HTMLElement,
    private readonly pin: HTMLElement,
    private readonly track: HTMLElement,
  ) {
    this.cards = qsa('[data-station]', track);
    this.current = qs('[data-missions-current]', section);
    this.bar = qs('[data-missions-bar]', section);
  }

  // envolve o pin no spacer junto com a troca de layout (o mesmo frame paga as duas mudanças)
  wrap(): void {
    this.pin.before(this.spacer);
    this.spacer.append(this.pin);
  }

  create(): void {
    const { pin, track } = this;
    // timeline (e não tween) com o pin: o ScrollTrigger pula a medida imediata e espera o refresh
    // global, que já é obrigatório depois de um pin. Uma medida da página em vez de duas
    this.timeline = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        pin: true,
        pinSpacer: this.spacer,
        // mede antes de todo mundo em qualquer refresh: o espaço do pin empurra os gatilhos abaixo
        // (vale pros que nasceram antes dele e se o pin renascer, ex.: resize cruzando os 1024px)
        refreshPriority: 1,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // tela baixa: prende pelo topo pra não cortar os cards; senão encosta embaixo e deixa o alto livre pro mapa 3D
        start: () => (pin.offsetHeight > window.innerHeight * 0.85 ? 'top top+=64' : 'bottom bottom-=40'),
        end: () => `+=${this.distance()}`,
        onUpdate: (st) => this.progress(st.progress),
      },
    });
    this.timeline.to(track, { x: () => -this.distance(), ease: 'none' });
    refreshSoon();
    track.addEventListener('focusin', this.onFocusIn);
  }

  // a timeline e o pin somem com o contexto do matchMedia; aqui só o que é nosso
  destroy(): void {
    this.track.removeEventListener('focusin', this.onFocusIn);
    this.bar?.style.removeProperty('transform');
    this.timeline = null;
    if (this.pin.parentNode === this.spacer) this.spacer.replaceWith(this.pin);
  }

  // quanto o trilho precisa andar pra o último card encostar na margem direita
  private distance(): number {
    const gutter = parseFloat(getComputedStyle(this.pin).paddingLeft) || 0;
    return Math.max(0, this.track.scrollWidth - (this.pin.clientWidth - gutter * 2));
  }

  private progress(value: number): void {
    if (this.bar) this.bar.style.transform = `scaleX(${value.toFixed(3)})`;
    const index = Math.round(value * Math.max(0, this.cards.length - 1));
    if (index === this.shown || !this.current) return;
    this.shown = index;
    this.current.textContent = String(index + 1).padStart(2, '0');
  }

  // foco por teclado num card fora da vista: rola até o ponto em que ele aparece
  private readonly onFocusIn = (event: FocusEvent): void => {
    const st = this.timeline?.scrollTrigger;
    const card = (event.target as Element | null)?.closest<HTMLElement>('[data-station]');
    if (!st || !card) return;
    const ratio = clamp(this.cards.indexOf(card) / Math.max(1, this.cards.length - 1));
    window.scrollTo({ top: st.start + ratio * (st.end - st.start), behavior: 'auto' });
  };
}
