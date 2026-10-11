import { gsap } from '@presentation/motion/core/gsap';
import { afterNextPaint } from '@presentation/app/BootQueue';
import { qs } from '@shared/utils/dom';
import { MissionsPin } from './missions/MissionsPin';
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
    gsap
      .matchMedia()
      .add(HORIZONTAL_QUERY, (context) =>
        this.horizontal(section, new MissionsPin(section, pin, track), context),
      );
  }

  private horizontal(section: HTMLElement, pin: MissionsPin, context: gsap.Context): () => void {
    section.classList.add('is-horizontal');
    pin.wrap();
    // o layout horizontal entra no próximo frame e o pin nasce depois dele, lendo a página já pronta
    // (criar junto forçava esse layout inteiro dentro da mesma tarefa)
    let active = true;
    afterNextPaint(() => {
      if (active) context.add(() => pin.create());
    });
    return () => {
      active = false;
      pin.destroy();
      section.classList.remove('is-horizontal');
    };
  }
}
