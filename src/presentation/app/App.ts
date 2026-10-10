import { EventBus } from '@shared/core/EventBus';
import { isCoarsePointer, prefersReducedMotion } from '@shared/utils/env';
import { onIdle } from '@shared/utils/dom';
import { mountMotion } from '@presentation/motion/core/mountMotion';
import { mountViews } from '@presentation/views/mountViews';
import { mountAnimators } from '@presentation/motion/animators/mountAnimators';
import { readAppConfig } from './AppConfig';
import type { AppContext } from './AppContext';
import type { AppEvents } from './AppEvents';

// depois do próximo frame pintado: o hero (LCP) aparece antes de qualquer JS pesado
const afterPaint = (fn: () => void): void => {
  requestAnimationFrame(() => setTimeout(fn, 0));
};

const afterLoad = (fn: () => void): void => {
  if (document.readyState === 'complete') fn();
  else window.addEventListener('load', fn, { once: true });
};

// bootstrap do browser: monta na ordem do que é mais crítico pro usuário,
// cada etapa numa tarefa própria pra nunca segurar o primeiro paint (celular fraco travava em ~4s)
export class App {
  private static booted = false;

  static boot(): void {
    if (App.booted) return;
    App.booted = true;
    afterPaint(() => new App().start());
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
    // 2) entradas das seções (SplitText + gatilhos de scroll) em outra tarefa
    setTimeout(() => mountAnimators(ctx), 0);
    // 3) three.js num chunk separado: só depois do load, quando o navegador respirar
    afterLoad(() => onIdle(() => this.loadExperience(ctx)));
  }

  private loadExperience(ctx: AppContext): void {
    import('@presentation/experience/mountExperience')
      .then(({ mountExperience }) => mountExperience(ctx))
      .catch((error: unknown) => {
        console.error('[app] experience failed', error);
        ctx.bus.emit('experience:fallback', { reason: 'load-error' });
      });
  }
}
