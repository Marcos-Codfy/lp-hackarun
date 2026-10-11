import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
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

// entradas das seções, um passo do boot cada (os controladores de DOM o App monta antes, em passo próprio)
export function mountAnimators(ctx: AppContext, boot: BootSteps): void {
  // o pin das missões vem primeiro (e faz o refresh global): ele empurra o layout de tudo abaixo.
  // Os outros só velam no boot; os gatilhos deles nascem perto da tela, já com o pin no lugar
  // (e o refreshPriority do pin mantém a ordem certa em qualquer refresh depois)
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
    .schedule(ctx, boot);
}
