import { EventBus } from '@shared/core/EventBus';
import { isCoarsePointer, prefersReducedMotion } from '@shared/utils/env';
import { onIdle } from '@shared/utils/dom';
import { mountMotion } from '@presentation/motion/core/mountMotion';
import { mountViews } from '@presentation/views/mountViews';
import { mountAnimators } from '@presentation/motion/animators/mountAnimators';
import { readAppConfig } from './AppConfig';
import type { AppContext } from './AppContext';
import type { AppEvents } from './AppEvents';

// bootstrap do browser: monta na ordem do que é mais crítico pro usuário
export class App {
  private static booted = false;

  static boot(): void {
    if (App.booted) return;
    App.booted = true;
    new App().start();
  }

  private start(): void {
    const config = readAppConfig();
    if (!config) {
      console.error('[app] missing #app-config');
      return;
    }

    const reducedMotion = prefersReducedMotion();
    const bus = new EventBus<AppEvents>();
    const { motion, scenes } = mountMotion({ bus, reducedMotion });
    const ctx: AppContext = { bus, config, reducedMotion, coarsePointer: isCoarsePointer(), motion, scenes };

    // 1) contador, formulário, som, equipes: funcionam mesmo sem 3D
    mountViews(ctx);
    // 2) entradas das seções
    mountAnimators(ctx);
    // 3) three.js num chunk separado, só quando o navegador respirar
    onIdle(() => {
      import('@presentation/experience/mountExperience')
        .then(({ mountExperience }) => mountExperience(ctx))
        .catch((error: unknown) => {
          console.error('[app] experience failed', error);
          bus.emit('experience:fallback', { reason: 'load-error' });
        });
    });
  }
}
