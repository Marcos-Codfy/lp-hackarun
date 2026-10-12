// trilha de cenas: a seção do clímax (data-scene-hold) pede o globo calmo; sem ela, ninguém acalma
import { afterEach, describe, expect, it } from 'vitest';
import type { SceneKey } from '@presentation/app/AppEvents';
import { finaleIndexOf, holdIndexOf } from '@presentation/experience/scene/SceneTrack';

function page(html: string): readonly SceneKey[] {
  document.body.innerHTML = html;
  return Array.from(document.querySelectorAll<HTMLElement>('[data-scene]')).map(
    (el) => el.dataset['scene'] as SceneKey,
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SceneTrack', () => {
  it('acha a seção do clímax pelo data-scene-hold', () => {
    const sequence = page(
      '<section data-scene="core"></section><section data-scene="dust"></section>' +
        '<section data-scene="core" data-scene-hold="900"></section>',
    );
    expect(finaleIndexOf(sequence)).toBe(2);
    expect(holdIndexOf(sequence)).toBe(2);
  });

  it('sem data-scene-hold: a carga cai no último core, mas o globo calmo não liga (404)', () => {
    const sequence = page('<section data-scene="core"></section>');
    expect(finaleIndexOf(sequence)).toBe(-1);
    expect(holdIndexOf(sequence)).toBe(0);
  });
});
