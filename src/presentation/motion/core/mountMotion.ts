// STUB — será substituído pelo módulo de motion (Lenis + ScrollTrigger + SceneDirector)
import { Observable } from '@shared/core/Observable';
import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents, SceneKey } from '@presentation/app/AppEvents';
import type { MotionHandle, SceneTrack } from '@presentation/app/AppContext';

export function mountMotion(_deps: { bus: EventBus<AppEvents>; reducedMotion: boolean }): {
  motion: MotionHandle;
  scenes: SceneTrack;
} {
  const keys = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]')).map(
    (el) => el.dataset['scene'] as SceneKey,
  );
  return {
    motion: {
      scrollTo: (target) => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        el?.scrollIntoView();
      },
      stop: () => {},
      start: () => {},
    },
    scenes: { keys, progress: new Observable(0), velocity: new Observable(0) },
  };
}
