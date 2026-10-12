import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { MotionHandle, SceneTrack } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import { registerMotionPlugins, ScrollTrigger } from './gsap';
import { AnchorNavigator } from './AnchorNavigator';
import { landOnHash } from './HashLanding';
import { LayoutRefresher } from './LayoutRefresher';
import { NativeScroll } from './NativeScroll';
import { SceneDirector } from './SceneDirector';
import { SceneHoldWatcher } from './SceneHoldWatcher';
import { SmoothScroll } from './SmoothScroll';
import type { ScrollDriver } from './ScrollDriver';

const NOW: BootSteps = { add: (_name, run) => run() };

// composition root do movimento: scroll, trilha de cenas e a carga do globo final.
// `later` recebe o que mede a página (gatilhos das cenas e do globo): o boot roda depois das Views
export function mountMotion(deps: { bus: EventBus<AppEvents>; reducedMotion: boolean; later?: BootSteps }): {
  motion: MotionHandle;
  scenes: SceneTrack;
} {
  const { bus, reducedMotion, later = NOW } = deps;
  registerMotionPlugins();
  // barra de endereço do celular abrindo/fechando não deve disparar refresh;
  // load e fontes ficam só com o LayoutRefresher (o ScrollTrigger faria um 2º refresh completo no load)
  ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,resize' });

  const driver: ScrollDriver = reducedMotion ? new NativeScroll() : new SmoothScroll();
  new AnchorNavigator(driver);
  const director = new SceneDirector(bus, reducedMotion);
  new LayoutRefresher();
  later.add('scenes', () => director.start());
  later.add('scene hold', () => new SceneHoldWatcher(bus, reducedMotion));
  // veio de /equipes ou /privacidade com /#secao: o pin das missões muda a página depois do pulo do navegador
  later.add('initial hash', () => landOnHash(driver, ScrollTrigger));

  return { motion: driver, scenes: director.track };
}
