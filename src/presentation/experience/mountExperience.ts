import type { AppContext } from '@presentation/app/AppContext';
import { saveDataEnabled, supportsWebGL } from '@shared/utils/env';
import { buildStage } from './StageBuilder';

function blocker(): string | null {
  if (!supportsWebGL()) return 'no-webgl';
  if (saveDataEnabled()) return 'save-data';
  return null;
}

// entrada do chunk lazy do three.js; qualquer falha deixa o brilho em CSS e avisa o app
export async function mountExperience(ctx: AppContext): Promise<void> {
  const reason = blocker();
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-experience]');
  if (reason || !canvas) {
    ctx.bus.emit('experience:fallback', { reason: reason ?? 'no-canvas' });
    return;
  }

  try {
    const stage = await buildStage(canvas, ctx);
    // a classe is-experience-ready entra no 1º frame desenhado (o CSS faz o crossfade)
    stage.start(
      () => ctx.bus.emit('experience:ready', { tier: stage.tier }),
      (failure) => {
        stage.dispose();
        ctx.bus.emit('experience:fallback', { reason: failure });
      },
    );
  } catch (error) {
    console.error('[experience] webgl init failed', error);
    ctx.bus.emit('experience:fallback', { reason: 'renderer-error' });
  }
}
