import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import { qs } from '@shared/utils/dom';
import { HeaderScrollController } from './HeaderScrollController';
import { HudRailController } from './HudRailController';
import { MobileMenuController } from './MobileMenuController';
import { NavSpyController } from './NavSpyController';
import { SceneThemeController } from './theme/SceneThemeController';

// o App monta direto; a chamada antiga do mountAnimators na mesma fila vira no-op (sem header em dobro)
const mounted = new WeakSet<BootSteps>();

// controladores de DOM que não são MVVM (header, menu, nav spy, HUD, aurora); funcionam sem GSAP.
// Links internos ficam com o AnchorNavigator (motion/core). Header e menu primeiro: são o que a pessoa toca logo
export function mountControllers(ctx: AppContext, boot: BootSteps): void {
  if (mounted.has(boot)) return;
  mounted.add(boot);

  boot.add('header', () => {
    const header = qs('[data-site-header]');
    if (!header) return;
    new HeaderScrollController(header).mount();
    const toggle = qs<HTMLButtonElement>('[data-menu-toggle]');
    const panel = qs('[data-menu-panel]');
    if (toggle && panel) new MobileMenuController({ header, toggle, panel, motion: ctx.motion }).mount();
  });

  boot.add('nav spy', () => new NavSpyController(ctx.bus).mount());

  boot.add('aurora', () => {
    const aurora = qs('[data-aurora]');
    if (aurora) new SceneThemeController(ctx.bus, aurora).mount();
  });

  boot.add('hud rail', () => {
    const hud = qs('[data-hud]');
    if (hud) new HudRailController(hud).mount();
  });
}
