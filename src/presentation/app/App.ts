import { EventBus } from '@shared/core/EventBus';
import { isCoarsePointer, prefersReducedMotion } from '@shared/utils/env';
import { onIdle } from '@shared/utils/dom';
import { registerMotionPlugins } from '@presentation/motion/core/gsap';
import { mountMotion } from '@presentation/motion/core/mountMotion';
import { mountViews } from '@presentation/views/mountViews';
import { mountAnimators } from '@presentation/motion/animators/mountAnimators';
import { readAppConfig } from './AppConfig';
import type { AppContext } from './AppContext';
import type { AppEvents } from './AppEvents';
import { afterNextPaint, BootQueue, timed, yieldToMain } from './BootQueue';

const afterLoad = (fn: () => void): void => {
  if (document.readyState === 'complete') fn();
  else window.addEventListener('load', fn, { once: true });
};

// bootstrap do browser: monta na ordem do que é mais crítico pro usuário, um passo curto por tarefa
// (celular fraco travava em ~4s com tudo junto). Trilha "boot:*" no DevTools mostra o custo de cada um
export class App {
  private static booted = false;

  static boot(): void {
    if (App.booted) return;
    App.booted = true;
    // depois do próximo frame pintado: o hero (LCP) aparece antes de qualquer JS pesado
    afterNextPaint(() => void new App().start());
  }

  private async start(): Promise<void> {
    const config = readAppConfig();
    if (!config) {
      console.error('[app] missing #app-config');
      return;
    }

    const reducedMotion = prefersReducedMotion();
    const bus = new EventBus<AppEvents>();
    const boot = new BootQueue();
    // o que mede a página (cenas, carga do globo) vai pra fila de depois das Views e dos controladores,
    // um passo por frame: cada um lê o layout já calculado em vez de forçar outro
    const settle = new BootQueue('paint');
    // o register do ScrollTrigger força layout da página: tarefa só dele
    timed('boot:plugins', registerMotionPlugins);
    await yieldToMain();
    const { motion, scenes } = timed('boot:motion', () => mountMotion({ bus, reducedMotion, later: settle }));
    const ctx: AppContext = { bus, config, reducedMotion, coarsePointer: isCoarsePointer(), motion, scenes };

    // 1) contador, formulário, som, equipes: funcionam mesmo sem 3D
    mountViews(ctx, boot);
    // 2) header/menu + entradas das seções (o setup pesado espera a seção chegar perto da tela)
    mountAnimators(ctx, boot);
    // 3) three.js num chunk separado: só depois do load, quando o navegador respirar
    settle.add('experience', () => afterLoad(() => onIdle(() => this.loadExperience(ctx))));

    await boot.run();
    await settle.run();
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
