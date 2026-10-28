// pintura de uma mancha da aurora: o degradê é o do CSS (closest-side, metade da opacidade em `mid`, borda com a
// mesma cor em alpha 0) e as cores do sceneThemes.ts são lidas por inteiro
import { describe, expect, it } from 'vitest';
import {
  paintAuroraBlob,
  parseAuroraColor,
  type BlobContext,
} from '@presentation/controllers/theme/auroraPaint';
import { SCENE_THEMES } from '@presentation/controllers/theme/sceneThemes';

describe('parseAuroraColor', () => {
  it.each([
    ['rgb(18 100 255 / 0.38)', [18, 100, 255, 0.38]],
    ['rgb(0 229 255 / 0.2)', [0, 229, 255, 0.2]],
    ['rgba(148, 27, 255, 0.5)', [148, 27, 255, 0.5]],
    ['rgb(255 133 47 / 50%)', [255, 133, 47, 0.5]],
    ['rgb(1 2 3)', [1, 2, 3, 1]],
    ['  rgb(9 8 7 / .25) ', [9, 8, 7, 0.25]],
  ])('lê %s', (css, expected) => {
    expect(parseAuroraColor(css)).toEqual(expected);
  });

  it.each(['', 'azul', '#1264ff', 'rgb(1 2)', 'hsl(200 50% 50%)', 'rgb(a b c)'])('recusa "%s"', (css) => {
    expect(parseAuroraColor(css)).toBeNull();
  });

  it('limita canais acima de 255 e alpha fora de 0 a 1', () => {
    expect(parseAuroraColor('rgb(999 10 10 / 3)')).toEqual([255, 10, 10, 1]);
  });

  it('entende todas as cores de todas as cenas (nenhuma cai no modo sem canvas por engano)', () => {
    for (const theme of Object.values(SCENE_THEMES)) {
      for (const color of [theme.a, theme.b, theme.c]) expect(parseAuroraColor(color)).not.toBeNull();
    }
  });
});

// dublê do contexto 2D: guarda as chamadas na ordem
function fakeContext() {
  const calls: string[] = [];
  const stops: [number, string][] = [];
  const gradient = { addColorStop: (at: number, color: string) => stops.push([at, color]) };
  const ctx = {
    fillStyle: '' as unknown,
    clearRect: (...a: number[]) => calls.push(`clearRect ${a.join(',')}`),
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: (...a: number[]) => calls.push(`translate ${a.join(',')}`),
    scale: (...a: number[]) => calls.push(`scale ${a.join(',')}`),
    createRadialGradient: (...a: number[]) => {
      calls.push(`gradient ${a.join(',')}`);
      return gradient;
    },
    fillRect: (...a: number[]) => calls.push(`fillRect ${a.join(',')}`),
  };
  return { ctx: ctx as unknown as BlobContext & { fillStyle: unknown }, calls, stops, gradient };
}

describe('paintAuroraBlob', () => {
  it('limpa, estica o círculo unitário até a elipse do canvas e preenche', () => {
    const { ctx, calls, gradient } = fakeContext();
    paintAuroraBlob(ctx, 256, 200, [18, 100, 255, 0.38], 0.42);
    expect(calls).toEqual([
      'clearRect 0,0,256,200',
      'save',
      'translate 128,100',
      'scale 128,100',
      'gradient 0,0,0,0,0,1',
      'fillRect -1,-1,2,2',
      'restore',
    ]);
    expect(ctx.fillStyle).toBe(gradient);
  });

  it('degradê: cor cheia no centro, metade do alpha em mid e a mesma cor com alpha 0 na borda', () => {
    const { ctx, stops } = fakeContext();
    paintAuroraBlob(ctx, 192, 192, [148, 27, 255, 0.36], 0.45);
    expect(stops).toEqual([
      [0, 'rgba(148, 27, 255, 0.36)'],
      [0.45, 'rgba(148, 27, 255, 0.18)'],
      [1, 'rgba(148, 27, 255, 0)'],
    ]);
  });

  it('a borda nunca é "transparent" preto (acinzentaria a ponta do degradê)', () => {
    const { ctx, stops } = fakeContext();
    paintAuroraBlob(ctx, 192, 192, [255, 133, 47, 0.3], 0.45);
    expect(stops.at(-1)?.[1]).not.toMatch(/rgba\(0, 0, 0/);
  });
});
