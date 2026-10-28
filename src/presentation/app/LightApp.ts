import { EventBus } from '@shared/core/EventBus';
import { qs, qsa } from '@shared/utils/dom';
import { prefersReducedMotion } from '@shared/utils/env';
import { SIMULATION_ENABLED } from '@shared/config/registrationMode';
import { createClientContainer, type ClientContainer } from '@composition/client';
import { HeaderScrollController } from '@presentation/controllers/HeaderScrollController';
import { MobileMenuController } from '@presentation/controllers/MobileMenuController';
import { ScrollMotionController } from '@presentation/controllers/ScrollMotionController';
import { AnchorNavigator } from '@presentation/motion/core/AnchorNavigator';
import { NativeScroll } from '@presentation/motion/core/NativeScroll';
import { CountdownViewModel } from '@presentation/view-models/countdown/CountdownViewModel';
import { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';
import { CountdownView } from '@presentation/views/CountdownView';
import { MotionPreferenceView } from '@presentation/views/motion/MotionPreferenceView';
import { BackToEventLinks } from '@presentation/views/navigation/backToEvent';
import { CurrentPageLinks } from '@presentation/views/navigation/currentPageLinks';
import { PrintButtons } from '@presentation/views/print/PrintButtons';
import { mountTeams } from '@presentation/views/teams/mountTeams';
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

// âncoras sem entrada nova no histórico (o "Voltar ao evento" depende dele), o voltar pra LP no mesmo ponto e
// o link da própria página, que sobe em vez de recarregar
function mountNavigation(reducedMotion: boolean): void {
  new AnchorNavigator(new NativeScroll());
  new BackToEventLinks().mount();
  new CurrentPageLinks(reducedMotion).mount();
}

function mountMotionToggle(c: ClientContainer, bus: EventBus<AppEvents>, reducedMotion: boolean): void {
  const vm = new MotionPreferenceViewModel({ store: c.preferences, bus, reducedMotion });
  new MotionPreferenceView(vm, qsa<HTMLButtonElement>('[data-motion-toggle]')).mount();
}

function mountCountdowns(c: ClientContainer, reducedMotion: boolean): void {
  qsa('[data-countdown]').forEach((root) => {
    new CountdownView(root, new CountdownViewModel(c.getCountdown, c.clock), { calm: reducedMotion }).mount();
  });
}

// formulário de inscrição (só em /inscricao): chunk à parte, baixado na hora (é o conteúdo da página). Em
// breve ou encerrada o HTML do build já basta: nada de baixar envio e foto à toa
const ACCEPTING = ['open', 'closing'];

async function mountRegistration(
  c: ClientContainer,
  config: AppConfig,
  bus: EventBus<AppEvents>,
): Promise<void> {
  const root = qs('[data-registration-form]');
  if (!root || !ACCEPTING.includes(root.dataset['status'] ?? '')) return;
  const [{ mountRegistrationPage }, services] = await Promise.all([
    import('@presentation/views/registration/mountRegistrationPage'),
    c.loadRegistration(),
  ]);
  mountRegistrationPage({ root, config, bus, services, container: c, reducedMotion: prefersReducedMotion() });
}

// cadastro de mentor (só em /seja-mentor): mesmo esquema, chunk à parte. Sem planilha (em breve) o HTML do build basta
async function mountMentor(c: ClientContainer): Promise<void> {
  const root = qs('[data-mentor-form]');
  if (!root || root.dataset['status'] !== 'open') return;
  const [{ mountMentorPage }, services] = await Promise.all([
    import('@presentation/views/mentor/mountMentorPage'),
    c.loadMentors(),
  ]);
  mountMentorPage({ root, services, container: c, reducedMotion: prefersReducedMotion() });
}

// boot das páginas leves (/equipes, /inscricao, /seja-mentor, /autorizacao): header, navegação, "Pausar animações",
// contador, equipes ao vivo, o formulário e o botão de imprimir. Nada de GSAP, Lenis ou three.js: o HTML já
// chega pronto e o JS só liga o interativo
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
    const reducedMotion = prefersReducedMotion();
    const bus = new EventBus<AppEvents>();
    const boot = new BootQueue();
    const container: { current: ClientContainer | null } = { current: null };
    const withContainer = (run: (c: ClientContainer) => void) => () => {
      if (container.current) run(container.current);
    };
    boot.add('header', mountHeader);
    boot.add('navigation', () => mountNavigation(reducedMotion));
    boot.add('print', () => new PrintButtons().mount());
    // loops decorativos (a aurora do fundo) param enquanto a página rola, como na LP
    boot.add('scroll motion', () => new ScrollMotionController().mount());
    boot.add('views container', () => {
      container.current = createClientContainer(config, { simulation: SIMULATION_ENABLED });
    });
    boot.add(
      'motion',
      withContainer((c) => mountMotionToggle(c, bus, reducedMotion)),
    );
    boot.add(
      'countdown',
      withContainer((c) => mountCountdowns(c, reducedMotion)),
    );
    boot.add(
      'teams',
      withContainer((c) => {
        mountTeams(c, config.registration.slots);
      }),
    );
    boot.add(
      'registration',
      withContainer((c) => {
        mountRegistration(c, config, bus).catch((error: unknown) =>
          console.error('[light-app] registration failed', error),
        );
      }),
    );
    boot.add(
      'mentor',
      withContainer((c) => {
        mountMentor(c).catch((error: unknown) => console.error('[light-app] mentor failed', error));
      }),
    );
    await boot.run();
  }
}
