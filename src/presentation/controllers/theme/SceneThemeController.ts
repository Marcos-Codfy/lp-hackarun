import type { AppEvents, SceneKey } from '@presentation/app/AppEvents';
import type { EventBus } from '@shared/core/EventBus';
import { SCENE_THEMES } from './sceneThemes';

// Observer: a cena que entra pinta a aurora do fundo. A transição é do CSS
// (as --aurora-* são @property <color>, então interpolam suave)
export class SceneThemeController {
  private readonly bus: EventBus<AppEvents>;
  private readonly aurora: HTMLElement;
  private off: (() => void) | null = null;
  private current: SceneKey | null = null;

  constructor(bus: EventBus<AppEvents>, aurora: HTMLElement) {
    this.bus = bus;
    this.aurora = aurora;
  }

  mount(): void {
    this.apply('core');
    this.off = this.bus.on('scene:enter', ({ key }) => this.apply(key));
  }

  destroy(): void {
    this.off?.();
  }

  private apply(key: SceneKey): void {
    if (key === this.current) return;
    this.current = key;
    const theme = SCENE_THEMES[key];
    this.aurora.style.setProperty('--aurora-a', theme.a);
    this.aurora.style.setProperty('--aurora-b', theme.b);
    this.aurora.style.setProperty('--aurora-c', theme.c);
    // outros componentes podem reagir à cena só com CSS: html[data-scene-theme='trophy'] ...
    document.documentElement.dataset['sceneTheme'] = key;
  }
}
