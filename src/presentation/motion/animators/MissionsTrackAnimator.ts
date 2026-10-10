import { gsap } from '@presentation/motion/core/gsap';
import { clamp } from '@shared/utils/math';
import { qs, qsa } from '@shared/utils/dom';
import { SectionAnimator } from './SectionAnimator';

// só no desktop e com movimento liberado; abaixo disso fica a grade/lista do CSS
const HORIZONTAL_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

// missões: trilho horizontal preso (pin) que anda com o scroll vertical
export class MissionsTrackAnimator extends SectionAnimator {
  protected readonly selector = '[data-missions]';

  protected override setup(section: HTMLElement): void {
    const pin = qs('[data-missions-pin]', section);
    const track = qs('[data-missions-track]', section);
    if (!pin || !track) return;
    gsap.matchMedia().add(HORIZONTAL_QUERY, () => this.horizontal(section, pin, track));
  }

  private horizontal(section: HTMLElement, pin: HTMLElement, track: HTMLElement): () => void {
    section.classList.add('is-horizontal');
    const cards = qsa('[data-station]', track);
    const current = qs('[data-missions-current]', section);
    const bar = qs('[data-missions-bar]', section);
    let shown = -1;

    // quanto o trilho precisa andar pra o último card encostar na margem direita
    const distance = () => {
      const gutter = parseFloat(getComputedStyle(pin).paddingLeft) || 0;
      return Math.max(0, track.scrollWidth - (pin.clientWidth - gutter * 2));
    };

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // tela baixa: prende pelo topo pra não cortar os cards; senão encosta embaixo e deixa o alto livre pro mapa 3D
        start: () => (pin.offsetHeight > window.innerHeight * 0.85 ? 'top top+=64' : 'bottom bottom-=40'),
        end: () => `+=${distance()}`,
        onUpdate: (st) => {
          if (bar) bar.style.transform = `scaleX(${st.progress.toFixed(3)})`;
          const index = Math.round(st.progress * Math.max(0, cards.length - 1));
          if (index === shown || !current) return;
          shown = index;
          current.textContent = String(index + 1).padStart(2, '0');
        },
      },
    });

    // foco por teclado num card fora da vista: rola até o ponto em que ele aparece
    const onFocusIn = (event: FocusEvent) => {
      const st = tween.scrollTrigger;
      const card = (event.target as Element | null)?.closest<HTMLElement>('[data-station]');
      if (!st || !card) return;
      const ratio = clamp(cards.indexOf(card) / Math.max(1, cards.length - 1));
      window.scrollTo({ top: st.start + ratio * (st.end - st.start), behavior: 'auto' });
    };
    track.addEventListener('focusin', onFocusIn);

    return () => {
      track.removeEventListener('focusin', onFocusIn);
      section.classList.remove('is-horizontal');
      if (bar) bar.style.removeProperty('transform');
    };
  }
}
