import { ScrollTrigger } from '@presentation/motion/core/gsap';
import type { AppContext } from '@presentation/app/AppContext';
import { mountControllers } from '@presentation/controllers/mountControllers';
import { AnimatorRegistry } from './AnimatorRegistry';
import { BarGrowAnimator } from './BarGrowAnimator';
import { CounterAnimator } from './CounterAnimator';
import { FadeUpAnimator } from './FadeUpAnimator';
import { HeadingRevealAnimator } from './HeadingRevealAnimator';
import { HeroIntroAnimator } from './HeroIntroAnimator';
import { MissionsTrackAnimator } from './MissionsTrackAnimator';
import { SpotlightAnimator } from './SpotlightAnimator';
import { TerminalTypeAnimator } from './TerminalTypeAnimator';
import { TimelineAnimator } from './TimelineAnimator';

// entradas das seções + controladores de layout (header, menu, âncoras)
export function mountAnimators(ctx: AppContext): void {
  mountControllers(ctx);

  // o pin das missões vem primeiro: ele empurra o layout de tudo que está abaixo
  new AnimatorRegistry()
    .register(
      new MissionsTrackAnimator(),
      new HeroIntroAnimator(),
      new HeadingRevealAnimator(),
      new FadeUpAnimator(),
      new CounterAnimator(),
      new BarGrowAnimator(),
      new TimelineAnimator(),
      new TerminalTypeAnimator(),
      new SpotlightAnimator(),
    )
    .mountAll(ctx);

  // triggers criados antes do pin (ex.: cenas do motion) recalculam na ordem da página
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  void document.fonts.ready.then(() => ScrollTrigger.refresh());
}
