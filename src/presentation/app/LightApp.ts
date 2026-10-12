import { EventBus } from '@shared/core/EventBus';
import { qs, qsa, readJsonAttr } from '@shared/utils/dom';
import { prefersReducedMotion } from '@shared/utils/env';
import type { SlotsDTO } from '@application/index';
import { createClientContainer, type ClientContainer } from '@composition/client';
import { HeaderScrollController } from '@presentation/controllers/HeaderScrollController';
import { MobileMenuController } from '@presentation/controllers/MobileMenuController';
import { NativeScroll } from '@presentation/motion/core/NativeScroll';
import { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';
import { TeamsViewModel, type PublicTeam } from '@presentation/view-models/teams/TeamsViewModel';
import { MotionPreferenceView } from '@presentation/views/motion/MotionPreferenceView';
import { TeamsView } from '@presentation/views/TeamsView';
import { readAppConfig, type AppConfig } from './AppConfig';
import type { AppEvents } from './AppEvents';
import { afterNextPaint, BootQueue } from './BootQueue';

function mountHeader(): void {
  const header = qs('[data-site-header]');
  if (!header) return;
  new HeaderScrollController(header).mount();
  const toggle = qs<HTMLButtonElement>('[data-menu-toggle]');
  const panel = qs('[data-menu-panel]');
  // sem Lenis: o menu trava o scroll nativo
  if (toggle && panel)
    new MobileMenuController({ header, toggle, panel, motion: new NativeScroll() }).mount();
}

function mountMotionToggle(c: ClientContainer, bus: EventBus<AppEvents>): void {
  const vm = new MotionPreferenceViewModel({
    store: c.preferences,
    bus,
    reducedMotion: prefersReducedMotion(),
  });
  new MotionPreferenceView(vm, qsa<HTMLButtonElement>('[data-motion-toggle]')).mount();
}

function mountTeams(c: ClientContainer, config: AppConfig): void {
  qsa('[data-teams]').forEach((root) => {
    const vm = new TeamsViewModel({
      initial: readJsonAttr<PublicTeam[]>(root, 'data-teams-initial', []),
      slots: readJsonAttr<SlotsDTO>(root, 'data-teams-slots', config.registration.slots),
      listTeams: c.listTeams,
    });
    new TeamsView(root, vm).mount();
  });
}

// boot das páginas leves (/equipes): header, menu, "Pausar animações" e a lista de equipes ao vivo.
// Nada de GSAP, Lenis ou three.js: o HTML já chega pronto e o JS só liga o que é interativo
export class LightApp {
  private static booted = false;

  static boot(): void {
    if (LightApp.booted) return;
    LightApp.booted = true;
    afterNextPaint(() => {
      LightApp.start().catch((error: unknown) => console.error('[light-app] boot failed', error));
    });
  }

  private static async start(): Promise<void> {
    const config = readAppConfig();
    if (!config) {
      console.error('[light-app] missing #app-config');
      return;
    }
    const bus = new EventBus<AppEvents>();
    const boot = new BootQueue();
    const container: { current: ClientContainer | null } = { current: null };
    boot.add('header', mountHeader);
    boot.add('views container', () => {
      container.current = createClientContainer(config, { dev: import.meta.env.DEV });
    });
    boot.add('motion', () => container.current && mountMotionToggle(container.current, bus));
    boot.add('teams', () => container.current && mountTeams(container.current, config));
    await boot.run();
  }
}
