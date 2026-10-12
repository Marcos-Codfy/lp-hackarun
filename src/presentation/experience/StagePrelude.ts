import type { AppContext } from '@presentation/app/AppContext';
import { CanvasResizer } from './CanvasResizer';
import { whenFramesSettle } from './FrameSettle';
import { createContext, warmContext, type ContextAnswers } from './GpuContext';
import type { ParticleBuffers } from './particles/ParticleBuffers';
import { QualityDetector } from './quality/QualityDetector';
import { profileFor } from './quality/QualityProfile';
import { trackOf, type Track } from './scene/SceneTrack';
import { ShapeSource } from './shapes/ShapeSource';

// formas pedidas antes de saber o tier de verdade (o worker não espera a GPU)
export interface ShapeOrder {
  source: ShapeSource;
  count: number;
  buffers: Promise<ParticleBuffers>;
}

// o que o boot adianta sem o three: formas no worker e contexto aquecido, enquanto o chunk dele baixa
export interface Prelude {
  track: Track;
  context: WebGL2RenderingContext;
  answers: ContextAnswers;
  shapes: ShapeOrder;
}

export async function startPrelude(canvas: HTMLCanvasElement, ctx: AppContext): Promise<Prelude> {
  const track = trackOf(ctx);
  // tier provável (sem o nome da GPU): contagem das formas e tamanho do canvas; o builder corrige se errar
  const guess = profileFor(QualityDetector.guess(ctx.coarsePointer));
  const source = new ShapeSource();
  const shapes: ShapeOrder = { source, count: guess.count, buffers: source.request(track.keys, guess.count) };
  try {
    // as formas já saíram pro worker; o contexto espera a GPU largar o resto da página (FrameSettle)
    await whenFramesSettle();
    CanvasResizer.presize(canvas, guess.maxDpr);
    const context = createContext(canvas);
    const answers = await warmContext(context);
    return { track, context, answers, shapes };
  } catch (error) {
    source.cancel();
    throw error;
  }
}

// o three não chegou: nada fica calculando nem segurando contexto
export function releasePrelude({ shapes, context }: Prelude): void {
  shapes.source.cancel();
  context.getExtension('WEBGL_lose_context')?.loseContext();
}
