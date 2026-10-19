import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import { LazyMount } from '@presentation/app/LazyMount';
import { qs, qsa } from '@shared/utils/dom';
import { DayTabsController } from './DayTabsController';
import { FaqHashController } from './FaqHashController';
import { HeaderScrollController } from './HeaderScrollController';
import { HudRailController } from './HudRailController';
import { MobileMenuController } from './MobileMenuController';
import { NavSpyController } from './NavSpyController';
import { OffscreenMotionController } from './OffscreenMotionController';
import { scheduleDates, todayForSchedule } from './scheduleToday';
import { SceneThemeController } from './theme/SceneThemeController';

// o App monta direto; a chamada antiga do mountAnimators na mesma fila vira no-op (sem header em dobro)
const mounted = new WeakSet<BootSteps>();
const EVENT_TIME_ZONE = 'America/Araguaina';

// controladores de DOM que não são MVVM (header, menu, abas da programação, trilho das missões no celular,
// nav spy, HUD, aurora, loops de CSS fora da tela); sem GSAP.
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

  // antes dos animadores: a programação já mede com um dia só (o LayoutRefresher refaz os gatilhos)
  boot.add('day tabs', () => {
    const roots = qsa('[data-day-tabs]');
    if (roots.length === 0) return;
    const today = todayForSchedule(scheduleDates(roots), new Date(), EVENT_TIME_ZONE);
    roots.forEach((root) => new DayTabsController(root, { today }).mount());
  });

  // contador do trilho de deslizar do celular: chunk à parte, baixado só perto da seção (fora do JS inicial)
  boot.add('missions rail', () => {
    const missions = qs('[data-missions]');
    if (!missions) return;
    new LazyMount(missions, async () => {
      const { MissionsRailController } = await import('./MissionsRailController');
      new MissionsRailController(missions).mount();
    }).watch();
  });

  boot.add('faq hash', () => new FaqHashController().mount());

  boot.add('nav spy', () => new NavSpyController(ctx.bus).mount());

  boot.add('aurora', () => {
    const aurora = qs('[data-aurora]');
    if (aurora) new SceneThemeController(ctx.bus, aurora).mount();
  });

  boot.add('hud rail', () => {
    const hud = qs('[data-hud]');
    if (hud) new HudRailController(hud).mount();
  });

  // pausa os loops de CSS das seções longe da tela (ver o controlador)
  boot.add('offscreen motion', () => new OffscreenMotionController().mount());
}
