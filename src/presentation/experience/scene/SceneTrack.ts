import type { AppContext } from '@presentation/app/AppContext';
import type { SceneKey } from '@presentation/app/AppEvents';

// a trilha de cenas da página: a sequência das seções e as formas únicas dela
export interface Track {
  sequence: readonly SceneKey[];
  keys: readonly SceneKey[];
}

export function trackOf(ctx: AppContext): Track {
  const sequence: readonly SceneKey[] = ctx.scenes.keys.length > 0 ? ctx.scenes.keys : ['core'];
  // core aparece no começo e no fim, mas vira um atributo só
  return { sequence, keys: [...new Set(sequence)] };
}

// índice da seção do clímax (data-scene-hold); -1 se a página não tem
export function finaleIndexOf(sequence: readonly SceneKey[]): number {
  // mesmo filtro do SceneDirector, pra o índice bater com a trilha
  const known = new Set<string>(sequence);
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]')).filter((el) =>
    known.has(el.dataset['scene'] ?? ''),
  );
  return sections.findIndex((el) => el.hasAttribute('data-scene-hold'));
}

// índice da seção que segura a carga; sem ela, o último core
export function holdIndexOf(sequence: readonly SceneKey[]): number {
  const index = finaleIndexOf(sequence);
  return index >= 0 ? index : sequence.lastIndexOf('core');
}
