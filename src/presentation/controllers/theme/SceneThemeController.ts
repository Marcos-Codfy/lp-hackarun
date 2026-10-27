import type { AppEvents, SceneKey } from '@presentation/app/AppEvents';
import type { EventBus } from '@shared/core/EventBus';
import { qsa } from '@shared/utils/dom';
import { paintAuroraBlob, parseAuroraColor, type BlobContext } from './auroraPaint';
import { SCENE_THEMES, type AuroraTheme } from './sceneThemes';

// posição em que o degradê da mancha chega à metade da opacidade (a = 42%, b e c = 45%, como no CSS)
const BLOB_MID: Record<keyof AuroraTheme, number> = { a: 0.42, b: 0.45, c: 0.45 };
const BLOBS = Object.keys(BLOB_MID) as (keyof AuroraTheme)[];

interface Layer {
  // um conjunto = as três manchas na paleta de uma cena; o CSS mostra um por vez (data-set no .aurora)
  canvases: Partial<Record<keyof AuroraTheme, { canvas: HTMLCanvasElement; ctx: BlobContext }>>;
  // ordem em que o conjunto foi mostrado pela última vez: o mais antigo é o primeiro a ser reaproveitado
  shownAt: number;
}

// Observer: a cena que entra pinta a aurora do fundo.
// A transição de cor é uma troca de opacidade entre conjuntos de camadas (compositor): interpolar as variáveis
// --aurora-* (@property) repintava as manchas gigantes a cada quadro, na thread principal, justamente na hora
// em que a página passa de uma seção pra outra. Três conjuntos dão folga pra trocas rápidas (um scroll
// forte): o reaproveitado é sempre o que está invisível há mais tempo. Sem canvas, cai na interpolação do CSS
export class SceneThemeController {
  private readonly bus: EventBus<AppEvents>;
  private readonly aurora: HTMLElement;
  private readonly layers: Layer[] = [];
  private off: (() => void) | null = null;
  private current: SceneKey | null = null;
  private visible = -1;
  private clock = 0;

  constructor(bus: EventBus<AppEvents>, aurora: HTMLElement) {
    this.bus = bus;
    this.aurora = aurora;
  }

  mount(): void {
    this.collectLayers();
    this.apply('core');
    this.off = this.bus.on('scene:enter', ({ key }) => this.apply(key));
  }

  destroy(): void {
    this.off?.();
  }

  // todos os canvases com contexto 2D, agrupados por conjunto; faltou algum (ou não há canvas): modo CSS
  private collectLayers(): void {
    const bySet = new Map<number, Layer>();
    for (const canvas of qsa<HTMLCanvasElement>('canvas[data-aurora-tex]', this.aurora)) {
      const set = Number(canvas.dataset['auroraSet']);
      const blob = canvas.dataset['auroraBlob'] as keyof AuroraTheme | undefined;
      const ctx = canvas.getContext?.('2d');
      if (!blob || !(blob in BLOB_MID) || !ctx || Number.isNaN(set)) return;
      const layer = bySet.get(set) ?? { canvases: {}, shownAt: -1 };
      layer.canvases[blob] = { canvas, ctx };
      bySet.set(set, layer);
    }
    const complete = [...bySet.entries()].sort(([a], [b]) => a - b).map(([, layer]) => layer);
    if (complete.length >= 2 && complete.every((layer) => BLOBS.every((blob) => layer.canvases[blob]))) {
      this.layers.push(...complete);
    }
  }

  private apply(key: SceneKey): void {
    if (key === this.current) return;
    this.current = key;
    const theme = SCENE_THEMES[key];
    if (!this.paintNextLayer(theme)) this.applyWithCssVariables(theme);
    // outros componentes podem reagir à cena só com CSS: html[data-scene-theme='trophy'] ...
    document.documentElement.dataset['sceneTheme'] = key;
  }

  // pinta o conjunto que está invisível há mais tempo e manda o CSS mostrá-lo (a opacidade faz o resto)
  private paintNextLayer(theme: AuroraTheme): boolean {
    if (this.layers.length === 0) return false;
    const colors = BLOBS.map((blob) => parseAuroraColor(theme[blob]));
    if (colors.some((color) => color === null)) return false;
    let next = -1;
    this.layers.forEach((layer, index) => {
      if (index === this.visible) return;
      if (next === -1 || layer.shownAt < (this.layers[next]?.shownAt ?? 0)) next = index;
    });
    const layer = this.layers[next];
    if (!layer) return false;
    BLOBS.forEach((blob, i) => {
      const target = layer.canvases[blob];
      const color = colors[i];
      if (target && color)
        paintAuroraBlob(target.ctx, target.canvas.width, target.canvas.height, color, BLOB_MID[blob]);
    });
    layer.shownAt = ++this.clock;
    this.visible = next;
    this.aurora.classList.add('aurora--live');
    this.aurora.dataset['set'] = String(next);
    return true;
  }

  private applyWithCssVariables(theme: AuroraTheme): void {
    this.aurora.style.setProperty('--aurora-a', theme.a);
    this.aurora.style.setProperty('--aurora-b', theme.b);
    this.aurora.style.setProperty('--aurora-c', theme.c);
  }
}
