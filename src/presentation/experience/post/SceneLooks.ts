import type { SceneKey } from '@presentation/app/AppEvents';

// "luz" de cada cena: força/raio/limiar do bloom, tinta do halo, exposição e cores do bokeh
export interface SceneLook {
  readonly bloom: number;
  readonly radius: number;
  readonly threshold: number;
  readonly tint: number;
  readonly exposure: number;
  readonly stars: number;
  readonly bokeh: readonly [number, number];
}

export const SCENE_LOOKS: Record<SceneKey, SceneLook> = {
  core: {
    bloom: 1.0,
    radius: 0.55,
    threshold: 0.1,
    tint: 0x2b4bff,
    exposure: 1.05,
    stars: 1,
    bokeh: [0x1264ff, 0x00e5ff],
  },
  orbit: {
    bloom: 1.05,
    radius: 0.58,
    threshold: 0.06,
    tint: 0x1a8cff,
    exposure: 1,
    stars: 1,
    bokeh: [0x00e5ff, 0x941bff],
  },
  enigma: {
    bloom: 1.15,
    radius: 0.64,
    threshold: 0.06,
    tint: 0x941bff,
    exposure: 1,
    stars: 0.8,
    bokeh: [0x941bff, 0xed28e8],
  },
  map: {
    bloom: 1.15,
    radius: 0.55,
    threshold: 0.05,
    tint: 0x1264ff,
    exposure: 1,
    stars: 0.9,
    bokeh: [0x00e5ff, 0xff852f],
  },
  terrain: {
    bloom: 1.0,
    radius: 0.66,
    threshold: 0.06,
    tint: 0xb02cff,
    exposure: 1,
    stars: 1,
    bokeh: [0x1264ff, 0xed28e8],
  },
  stage: {
    bloom: 1.1,
    radius: 0.6,
    threshold: 0.06,
    tint: 0x5a3cff,
    exposure: 1,
    stars: 0.7,
    bokeh: [0x00e5ff, 0x941bff],
  },
  trophy: {
    bloom: 0.75,
    radius: 0.5,
    threshold: 0.18,
    tint: 0xff852f,
    exposure: 1,
    stars: 0.8,
    bokeh: [0xff852f, 0xffc24a],
  },
  dust: {
    bloom: 0.8,
    radius: 0.6,
    threshold: 0.08,
    tint: 0x6a5cff,
    exposure: 0.95,
    stars: 1,
    bokeh: [0x3b5bff, 0x941bff],
  },
};
