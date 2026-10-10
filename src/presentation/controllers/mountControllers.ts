import type { AppContext } from '@presentation/app/AppContext';
import { qs } from '@shared/utils/dom';
import { AnchorNavController } from './AnchorNavController';
import { HeaderScrollController } from './HeaderScrollController';
import { HudRailController } from './HudRailController';
import { MobileMenuController } from './MobileMenuController';
import { NavSpyController } from './NavSpyController';
import { SceneThemeController } from './theme/SceneThemeController';

// controladores de DOM que não são MVVM (header, menu, âncoras, HUD, aurora); funcionam sem GSAP
export function mountControllers(ctx: AppContext): void {
  const header = qs('[data-site-header]');
  if (header) new HeaderScrollController(header).mount();

  const toggle = qs<HTMLButtonElement>('[data-menu-toggle]');
  const panel = qs('[data-menu-panel]');
  if (header && toggle && panel) {
    new MobileMenuController({ header, toggle, panel, motion: ctx.motion }).mount();
  }

  new AnchorNavController(ctx.motion).mount();
  new NavSpyController(ctx.bus).mount();

  const aurora = qs('[data-aurora]');
  if (aurora) new SceneThemeController(ctx.bus, aurora).mount();

  const hud = qs('[data-hud]');
  if (hud) new HudRailController(hud).mount();
}
