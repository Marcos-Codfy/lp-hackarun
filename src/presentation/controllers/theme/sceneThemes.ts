import type { SceneKey } from '@presentation/app/AppEvents';

// cores da aurora por cena (a = mancha principal, b = contraluz, c = toque de fundo)
export interface AuroraTheme {
  a: string;
  b: string;
  c: string;
}

// azul domina; violeta/magenta = mistério; laranja/ouro = prêmio (manual da marca)
export const SCENE_THEMES: Record<SceneKey, AuroraTheme> = {
  core: { a: 'rgb(18 100 255 / 0.38)', b: 'rgb(0 229 255 / 0.16)', c: 'rgb(148 27 255 / 0.16)' },
  orbit: { a: 'rgb(0 229 255 / 0.2)', b: 'rgb(18 100 255 / 0.34)', c: 'rgb(59 91 255 / 0.2)' },
  enigma: { a: 'rgb(148 27 255 / 0.36)', b: 'rgb(237 40 232 / 0.2)', c: 'rgb(0 229 255 / 0.1)' },
  map: { a: 'rgb(18 100 255 / 0.32)', b: 'rgb(0 229 255 / 0.2)', c: 'rgb(148 27 255 / 0.12)' },
  terrain: { a: 'rgb(18 100 255 / 0.34)', b: 'rgb(237 40 232 / 0.2)', c: 'rgb(148 27 255 / 0.14)' },
  stage: { a: 'rgb(0 229 255 / 0.22)', b: 'rgb(148 27 255 / 0.3)', c: 'rgb(18 100 255 / 0.16)' },
  trophy: { a: 'rgb(255 133 47 / 0.3)', b: 'rgb(255 194 74 / 0.18)', c: 'rgb(237 40 232 / 0.12)' },
  dust: { a: 'rgb(59 91 255 / 0.24)', b: 'rgb(148 27 255 / 0.16)', c: 'rgb(18 100 255 / 0.1)' },
};
