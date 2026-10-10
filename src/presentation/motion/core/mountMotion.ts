import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { MotionHandle, SceneTrack } from '@presentation/app/AppContext';
import { ScrollTrigger } from './gsap';
import { AnchorNavigator } from './AnchorNavigator';
import { LayoutRefresher } from './LayoutRefresher';
import { NativeScroll } from './NativeScroll';
import { SceneDirector } from './SceneDirector';
import { SceneHoldWatcher } from './SceneHoldWatcher';
import { SmoothScroll } from './SmoothScroll';
import type { ScrollDriver } from './ScrollDriver';

// composition root do movimento: scroll, trilha de cenas e a carga do globo final
export function mountMotion(deps: { bus: EventBus<AppEvents>; reducedMotion: boolean }): {
  motion: MotionHandle;
  scenes: SceneTrack;
} {
  const { bus, reducedMotion } = deps;
  // barra de endereço do celular abrindo/fechando não deve disparar refresh
  ScrollTrigger.config({ ignoreMobileResize: true });

  const driver: ScrollDriver = reducedMotion ? new NativeScroll() : new SmoothScroll();
  new AnchorNavigator(driver);
  const director = new SceneDirector(bus, reducedMotion);
  new SceneHoldWatcher(bus, reducedMotion);
  new LayoutRefresher();

  return { motion: driver, scenes: director.track };
}
