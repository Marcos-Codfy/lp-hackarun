import type { AppContext } from '@presentation/app/AppContext';
import { saveDataEnabled } from '@shared/utils/env';
import type { ExperienceStage } from './ExperienceStage';
import { releasePrelude, startPrelude } from './StagePrelude';
import { yieldToMain } from './yieldToMain';

// sem criar contexto de teste: um contexto WebGL a mais custava centenas de ms na thread principal.
// navegador sem WebGL2 nem tem a classe; GPU bloqueada aparece ao criar o contexto (renderer-error)
function blocker(): string | null {
  if (typeof WebGL2RenderingContext === 'undefined') return 'no-webgl';
  if (saveDataEnabled()) return 'save-data';
  return null;
}

// canvas opaco (preto = nada) somado à aurora em "screen". O blend vai na camada fixa, que é quem
// está no mesmo contexto de empilhamento da aurora; no canvas sozinho ele só misturaria com a própria camada
function composeOverAurora(canvas: HTMLCanvasElement): void {
  canvas.style.mixBlendMode = 'screen';
  if (canvas.parentElement) canvas.parentElement.style.mixBlendMode = 'screen';
}

// o chunk do three (grande) baixa e avalia enquanto o contexto aquece e o worker gera as formas.
// O import sai primeiro (o download começa antes do getContext); espera os dois lados: falha de um não
// deixa o outro solto
async function buildWhenLoaded(canvas: HTMLCanvasElement, ctx: AppContext): Promise<ExperienceStage> {
  const [builder, prelude] = await Promise.allSettled([import('./StageBuilder'), startPrelude(canvas, ctx)]);
  if (prelude.status === 'rejected') throw prelude.reason;
  if (builder.status === 'rejected') {
    releasePrelude(prelude.value);
    throw builder.reason;
  }
  return builder.value.buildStage(canvas, ctx, prelude.value);
}

// entrada do chunk lazy do 3D; qualquer falha deixa o brilho em CSS e avisa o app
export async function mountExperience(ctx: AppContext): Promise<void> {
  const reason = blocker();
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-experience]');
  if (reason || !canvas) {
    ctx.bus.emit('experience:fallback', { reason: reason ?? 'no-canvas' });
    return;
  }

  try {
    await yieldToMain();
    composeOverAurora(canvas);
    const stage = await buildWhenLoaded(canvas, ctx);
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
