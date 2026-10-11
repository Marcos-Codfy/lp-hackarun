import { WebGLRenderer } from 'three';
import type { AppContext } from '@presentation/app/AppContext';
import type { SceneKey } from '@presentation/app/AppEvents';
import { ExperienceStage } from './ExperienceStage';
import { answering } from './GpuContext';
import type { ParticleBuffers } from './particles/ParticleBuffers';
import { ParticleField } from './particles/ParticleField';
import { StageCompiler } from './post/StageCompiler';
import { StageRenderer } from './post/StageRenderer';
import { QualityDetector } from './quality/QualityDetector';
import { profileFor } from './quality/QualityProfile';
import { SceneMixer } from './scene/SceneMixer';
import { holdIndexOf } from './scene/SceneTrack';
import type { Prelude, ShapeOrder } from './StagePrelude';
import { StageWorld } from './StageWorld';
import { yieldToMain } from './yieldToMain';

interface Assembly {
  stage: ExperienceStage;
  field: ParticleField;
  shapes: Promise<ParticleBuffers>;
}

// maior gl_PointSize que a GPU aceita (o bokeh grande respeita esse teto)
function maxPointSizeOf(gl: WebGL2RenderingContext): number {
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
  return Math.max(16, range?.[1] ?? 64);
}

// o palpite de tier (sem o nome da GPU) errou: refaz com a contagem certa
function shapesFor(order: ShapeOrder, keys: readonly SceneKey[], count: number): Promise<ParticleBuffers> {
  if (count === order.count) return order.buffers;
  order.source.cancel();
  return order.source.request(keys, count);
}

// fase 1: renderer → tier → peças do palco, cada uma numa tarefa própria. As consultas síncronas que o
// construtor e o detector fariam já vieram respondidas do prelúdio.
// Canvas opaco e preto: a luz compõe sobre a aurora em "screen" (sem briga de alpha pré-multiplicado)
async function assemble(canvas: HTMLCanvasElement, ctx: AppContext, prelude: Prelude): Promise<Assembly> {
  const { context, answers, track, shapes: order } = prelude;
  const renderer = answering(
    context,
    answers,
    () =>
      new WebGLRenderer({
        canvas,
        context,
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      }),
  );
  try {
    await yieldToMain();
    renderer.setClearColor(0x000000, 1);
    const detector = new QualityDetector(context, ctx.coarsePointer);
    const { tier, maxPointSize } = answering(context, answers, () => ({
      tier: detector.detect(),
      maxPointSize: maxPointSizeOf(context),
    }));
    const profile = profileFor(tier);
    const { sequence, keys } = track;
    const shapes = shapesFor(order, keys, profile.count);
    await yieldToMain();

    const field = ParticleField.create(keys);
    await yieldToMain();
    // o programa das partículas leva segundos na GPU: entra na fila já, antes do resto do palco existir
    StageCompiler.queueAhead(renderer, field.points, profile.effects !== 'off');
    await yieldToMain();
    const mixer = new SceneMixer(sequence, keys);
    const world = new StageWorld(
      { field, mixer, keys, profile, holdIndex: holdIndexOf(sequence), maxPointSize },
      ctx,
    );
    await yieldToMain();
    const output = new StageRenderer(renderer, world.scene, world.camera, profile.effects);
    await yieldToMain();
    const stage = new ExperienceStage({ renderer, world, output, profile, adaptive: !detector.forced }, ctx);
    return { stage, field, shapes };
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

// fase 2: o resto dos programas compila enquanto o worker termina as formas.
// Compilar mal não trava o boot (o erro de shader aparece no 1º frame e cai no fallback)
async function prepare({ stage, field, shapes }: Assembly): Promise<void> {
  const compiled = stage.compile().catch(() => undefined);
  field.fill(await shapes);
  await compiled;
  await yieldToMain();
  await stage.warm();
}

export async function buildStage(
  canvas: HTMLCanvasElement,
  ctx: AppContext,
  prelude: Prelude,
): Promise<ExperienceStage> {
  // avaliar o chunk do three acabou de ocupar uma tarefa inteira
  await yieldToMain();
  let assembly: Assembly;
  try {
    assembly = await assemble(canvas, ctx, prelude);
  } catch (error) {
    prelude.shapes.source.cancel();
    throw error;
  }
  try {
    await prepare(assembly);
    return assembly.stage;
  } catch (error) {
    // daqui em diante o palco é dono do renderer
    prelude.shapes.source.cancel();
    assembly.stage.dispose();
    throw error;
  }
}
