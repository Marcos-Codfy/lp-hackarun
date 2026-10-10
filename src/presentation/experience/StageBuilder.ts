import { WebGLRenderer } from 'three';
import type { AppContext } from '@presentation/app/AppContext';
import type { SceneKey } from '@presentation/app/AppEvents';
import { ExperienceStage, type StageParts } from './ExperienceStage';
import { ParticleField } from './particles/ParticleField';
import { QualityDetector } from './quality/QualityDetector';
import { profileFor } from './quality/QualityProfile';
import { SceneMixer } from './scene/SceneMixer';
import { ShapeFactory } from './shapes/ShapeFactory';

// índice da seção que segura a carga (data-scene-hold); sem ela, o último core
function holdIndexOf(sequence: readonly SceneKey[]): number {
  // mesmo filtro do SceneDirector, pra o índice bater com a trilha
  const known = new Set<string>(sequence);
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]')).filter((el) =>
    known.has(el.dataset['scene'] ?? ''),
  );
  const index = sections.findIndex((el) => el.hasAttribute('data-scene-hold'));
  return index >= 0 ? index : sequence.lastIndexOf('core');
}

// maior gl_PointSize que a GPU aceita (o bokeh grande respeita esse teto)
function maxPointSizeOf(renderer: WebGLRenderer): number {
  const gl = renderer.getContext();
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
  return Math.max(16, range?.[1] ?? 64);
}

// Builder: renderer → tier → formas (assíncrono, uma por vez) → palco pronto pra start()
export async function buildStage(canvas: HTMLCanvasElement, ctx: AppContext): Promise<ExperienceStage> {
  // sem WebGL2 (three r163+) o construtor lança: quem chama cai no fallback em CSS.
  // canvas opaco e preto: a luz compõe sobre a aurora em "screen" (sem briga de alpha pré-multiplicado)
  const renderer = new WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
  });
  try {
    renderer.setClearColor(0x000000, 1);
    const detector = new QualityDetector(renderer.getContext(), ctx.coarsePointer);
    const profile = profileFor(detector.detect());
    const sequence: readonly SceneKey[] = ctx.scenes.keys.length > 0 ? ctx.scenes.keys : ['core'];
    // core aparece no começo e no fim, mas vira um atributo só
    const keys = [...new Set(sequence)];
    const mixer = new SceneMixer(sequence, keys);
    const field = await ParticleField.create(keys, profile.count, ShapeFactory.createDefault());
    const parts: StageParts = {
      renderer,
      field,
      mixer,
      keys,
      profile,
      adaptive: !detector.forced,
      holdIndex: holdIndexOf(sequence),
      maxPointSize: maxPointSizeOf(renderer),
    };
    return new ExperienceStage(parts, ctx);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}
