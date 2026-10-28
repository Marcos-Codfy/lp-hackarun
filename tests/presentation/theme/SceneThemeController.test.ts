// aurora de fundo: a cena que entra pinta um conjunto de canvases e o CSS faz o fade (data-set); sem canvas, cai
// nas variáveis --aurora-* do CSS
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { SceneThemeController } from '@presentation/controllers/theme/SceneThemeController';
import { SCENE_THEMES } from '@presentation/controllers/theme/sceneThemes';

const BLOBS = ['a', 'b', 'c'] as const;

interface Painted {
  stops: string[];
}

// monta o .aurora com `sets` conjuntos de 3 canvases; cada canvas guarda as cores com que foi pintado
function buildAurora(
  sets: number,
  withContext = true,
): { aurora: HTMLElement; painted: Map<string, Painted> } {
  const aurora = document.createElement('div');
  const painted = new Map<string, Painted>();
  for (const blob of BLOBS) {
    for (let set = 0; set < sets; set++) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      canvas.dataset['auroraTex'] = '';
      canvas.dataset['auroraBlob'] = blob;
      canvas.dataset['auroraSet'] = String(set);
      const key = `${blob}${set}`;
      const record: Painted = { stops: [] };
      painted.set(key, record);
      const gradient = { addColorStop: (_at: number, color: string) => record.stops.push(color) };
      const ctx = {
        fillStyle: '',
        clearRect: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        createRadialGradient: () => gradient,
        fillRect: () => {},
      };
      (canvas as unknown as { getContext: () => unknown }).getContext = () => (withContext ? ctx : null);
      aurora.append(canvas);
    }
  }
  document.body.append(aurora);
  return { aurora, painted };
}

const scene = (bus: EventBus<AppEvents>, key: keyof typeof SCENE_THEMES) =>
  bus.emit('scene:enter', { key, index: 0, sectionId: key });

describe('SceneThemeController', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    delete document.documentElement.dataset['sceneTheme'];
  });

  it('ao montar pinta a cena inicial no conjunto 0 e liga o modo canvas', () => {
    const { aurora, painted } = buildAurora(3);
    new SceneThemeController(new EventBus<AppEvents>(), aurora).mount();
    expect(aurora.dataset['set']).toBe('0');
    expect(aurora.classList.contains('aurora--live')).toBe(true);
    expect(painted.get('a0')?.stops[0]).toBe('rgba(18, 100, 255, 0.38)');
    expect(painted.get('b0')?.stops[0]).toBe('rgba(0, 229, 255, 0.16)');
    expect(painted.get('c0')?.stops[0]).toBe('rgba(148, 27, 255, 0.16)');
    expect(painted.get('a1')?.stops).toEqual([]);
  });

  it('cada cena nova vai pro conjunto que está invisível há mais tempo, nunca pro que está na tela', () => {
    const bus = new EventBus<AppEvents>();
    const { aurora, painted } = buildAurora(3);
    new SceneThemeController(bus, aurora).mount();
    scene(bus, 'enigma');
    expect(aurora.dataset['set']).toBe('1');
    expect(painted.get('a1')?.stops.at(-3)).toBe('rgba(148, 27, 255, 0.36)');
    scene(bus, 'trophy');
    expect(aurora.dataset['set']).toBe('2');
    // volta ao começo do anel: reaproveita o 0, o mais antigo (e o 1, que acabou de sair, fica intacto)
    scene(bus, 'dust');
    expect(aurora.dataset['set']).toBe('0');
    expect(painted.get('a0')?.stops.at(-3)).toBe('rgba(59, 91, 255, 0.24)');
    expect(painted.get('a1')?.stops.at(-3)).toBe('rgba(148, 27, 255, 0.36)');
  });

  it('a mesma cena de novo não repinta nem troca o conjunto', () => {
    const bus = new EventBus<AppEvents>();
    const { aurora } = buildAurora(3);
    new SceneThemeController(bus, aurora).mount();
    scene(bus, 'orbit');
    const before = aurora.dataset['set'];
    scene(bus, 'orbit');
    expect(aurora.dataset['set']).toBe(before);
  });

  it('com dois conjuntos só, alterna entre eles', () => {
    const bus = new EventBus<AppEvents>();
    const { aurora } = buildAurora(2);
    new SceneThemeController(bus, aurora).mount();
    const sets = [aurora.dataset['set']];
    scene(bus, 'orbit');
    sets.push(aurora.dataset['set']);
    scene(bus, 'stage');
    sets.push(aurora.dataset['set']);
    expect(sets).toEqual(['0', '1', '0']);
  });

  it('grava a cena no <html> pra outros componentes reagirem só com CSS', () => {
    const bus = new EventBus<AppEvents>();
    const { aurora } = buildAurora(3);
    new SceneThemeController(bus, aurora).mount();
    scene(bus, 'trophy');
    expect(document.documentElement.dataset['sceneTheme']).toBe('trophy');
  });

  it('sem contexto 2D (ou sem canvas) usa as variáveis --aurora-* e não liga o modo canvas', () => {
    const bus = new EventBus<AppEvents>();
    const { aurora } = buildAurora(3, false);
    new SceneThemeController(bus, aurora).mount();
    expect(aurora.classList.contains('aurora--live')).toBe(false);
    expect(aurora.dataset['set']).toBeUndefined();
    expect(aurora.style.getPropertyValue('--aurora-a')).toBe(SCENE_THEMES.core.a);
    scene(bus, 'trophy');
    expect(aurora.style.getPropertyValue('--aurora-a')).toBe(SCENE_THEMES.trophy.a);

    const empty = document.createElement('div');
    new SceneThemeController(bus, empty).mount();
    expect(empty.style.getPropertyValue('--aurora-b')).toBe(SCENE_THEMES.core.b);
  });

  it('destroy para de ouvir as cenas', () => {
    const bus = new EventBus<AppEvents>();
    const { aurora } = buildAurora(3);
    const controller = new SceneThemeController(bus, aurora);
    controller.mount();
    controller.destroy();
    scene(bus, 'dust');
    expect(aurora.dataset['set']).toBe('0');
    expect(document.documentElement.dataset['sceneTheme']).toBe('core');
  });
});
