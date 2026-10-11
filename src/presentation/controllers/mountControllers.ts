import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import { qs } from '@shared/utils/dom';
import { AnchorNavController } from './AnchorNavController';
import { HeaderScrollController } from './HeaderScrollController';
import { HudRailController } from './HudRailController';
import { MobileMenuController } from './MobileMenuController';
import { NavSpyController } from './NavSpyController';
import { SceneThemeController } from './theme/SceneThemeController';

// controladores de DOM que não são MVVM (header, menu, âncoras, HUD, aurora); funcionam sem GSAP.
// Header e menu primeiro: são o que a pessoa toca logo de cara
export function mountControllers(ctx: AppContext, boot: BootSteps): void {
  boot.add('header', () => {
    const header = qs('[data-site-header]');
    if (!header) return;
    new HeaderScrollController(header).mount();
    const toggle = qs<HTMLButtonElement>('[data-menu-toggle]');
    const panel = qs('[data-menu-panel]');
    if (toggle && panel) new MobileMenuController({ header, toggle, panel, motion: ctx.motion }).mount();
  });

  boot.add('nav', () => {
    new AnchorNavController(ctx.motion).mount();
    new NavSpyController(ctx.bus).mount();
  });

  boot.add('aurora', () => {
    const aurora = qs('[data-aurora]');
    if (aurora) new SceneThemeController(ctx.bus, aurora).mount();
  });

  boot.add('hud rail', () => {
    const hud = qs('[data-hud]');
    if (hud) new HudRailController(hud).mount();
  });
}
