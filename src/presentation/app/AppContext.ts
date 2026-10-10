import type { EventBus } from '@shared/core/EventBus';
import type { Observable } from '@shared/core/Observable';
import type { AppConfig } from './AppConfig';
import type { AppEvents, SceneKey } from './AppEvents';

export interface MotionHandle {
  // rola até um seletor/elemento respeitando o smooth scroll (ou instantâneo em reduced motion)
  scrollTo(target: string | HTMLElement, options?: { offset?: number; immediate?: boolean }): void;
  stop(): void;
  start(): void;
}

// trilha das cenas 3D, alimentada pelo scroll e lida pela experiência three.js
export interface SceneTrack {
  // ordem das seções com data-scene na página
  readonly keys: readonly SceneKey[];
  // índice contínuo: 2.5 = metade do caminho entre a cena 2 e a 3
  readonly progress: Observable<number>;
  // velocidade do scroll normalizada 0..1 (dá "rajada" nas partículas)
  readonly velocity: Observable<number>;
}

// tudo que os módulos de apresentação recebem do bootstrap (injeção manual)
export interface AppContext {
  bus: EventBus<AppEvents>;
  config: AppConfig;
  reducedMotion: boolean;
  coarsePointer: boolean;
  motion: MotionHandle;
  scenes: SceneTrack;
}
