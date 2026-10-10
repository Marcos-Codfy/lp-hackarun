import type { AppContext } from '@presentation/app/AppContext';
import { qs } from '@shared/utils/dom';
import { AnchorNavController } from './AnchorNavController';
import { HeaderScrollController } from './HeaderScrollController';
import { MobileMenuController } from './MobileMenuController';
import { NavSpyController } from './NavSpyController';

// controladores de DOM que não são MVVM (header, menu, âncoras); funcionam sem GSAP
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
}
