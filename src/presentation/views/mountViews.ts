// monta as Views MVVM (pausa das animações, contador, equipes, inscrição, HUD, NPCs) sobre o container
import { createClientContainer, type ClientContainer } from '@composition/client';
import { qs, qsa } from '@shared/utils/dom';
import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import { LazyMount } from '@presentation/app/LazyMount';
import { CountdownViewModel } from '@presentation/view-models/countdown/CountdownViewModel';
import type { TeamsViewModel } from '@presentation/view-models/teams/TeamsViewModel';
import { HudViewModel } from '@presentation/view-models/hud/HudViewModel';
import { NpcHuntViewModel } from '@presentation/view-models/npc/NpcHuntViewModel';
import { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';
import { CountdownView } from './CountdownView';
import type { RegistrationFormView } from './RegistrationFormView';
import { RegistrationCtaController } from './RegistrationCtaController';
import { ChargeRevealView } from './ChargeRevealView';
import { HudView } from './HudView';
import { NpcTokenView } from './NpcTokenView';
import { MotionPreferenceView } from './motion/MotionPreferenceView';

// guarda o container e os VMs que mais de uma View usa (NPC, equipes) entre os passos do boot
class ViewMounter {
  private c: ClientContainer | null = null;
  private npc: NpcHuntViewModel | null = null;
  private form: RegistrationFormView | null = null;
  // origem do último CTA de inscrição (o VM do formulário nasce depois, quando o chunk chega)
  private intent: string | null = null;
  // lista ao vivo das equipes: vagas esgotadas na planilha fecham o formulário
  private teamsVm: TeamsViewModel | null = null;
  private teamsLazy: LazyMount | null = null;

  constructor(private readonly ctx: AppContext) {}

  container(): void {
    try {
      this.c = createClientContainer(this.ctx.config, { dev: import.meta.env.DEV });
    } catch (error) {
      // config quebrada (data inválida...): a página continua legível só com o HTML
      console.error('[views] client container failed', error);
      return;
    }
    this.npc = new NpcHuntViewModel({ store: this.c.preferences, bus: this.ctx.bus });
  }

  // logo no começo: quem pausou na visita anterior não vê os loops rodando enquanto o resto monta
  motion(c: ClientContainer): void {
    const { bus, reducedMotion } = this.ctx;
    const vm = new MotionPreferenceViewModel({ store: c.preferences, bus, reducedMotion });
    new MotionPreferenceView(vm, qsa<HTMLButtonElement>('[data-motion-toggle]')).mount();
  }

  countdown(c: ClientContainer): void {
    qsa('[data-countdown]').forEach((root) => {
      const vm = new CountdownViewModel(c.getCountdown, c.clock);
      new CountdownView(root, vm, { calm: this.ctx.reducedMotion }).mount();
    });
  }

  hud(): void {
    const root = qs('[data-hud]');
    if (!root || !this.npc) return;
    const sections = qsa('[data-checkpoint]');
    const vm = new HudViewModel(sections.map((s) => s.dataset['checkpoint'] ?? ''));
    new HudView(root, { vm, npc: this.npc, sections }).mount();
  }

  npcTokens(): void {
    const { npc } = this;
    if (!npc) return;
    qsa<HTMLButtonElement>('[data-npc-token]').forEach((b) => new NpcTokenView(b, npc).mount());
  }

  // CTAs moram no hero e no header: entram cedo; o formulário (lá embaixo) chega depois
  registrationCta(): void {
    new RegistrationCtaController(this.ctx, () => this.form?.focusEntry() ?? false).mount();
    const section = qs('#inscricao');
    if (section) new ChargeRevealView(this.ctx, section).mount();
  }

  // o formulário (VM, View, envio e foto) é o maior pedaço do JS e mora no fim da página: chunk à parte,
  // carregado quando a seção chega perto da tela, quando a pessoa interage nele ou quando um CTA leva até lá
  registrationForm(c: ClientContainer): void {
    const root = qs('[data-registration-form]');
    if (!root) return;
    const lazy = new LazyMount(root.closest<HTMLElement>('section') ?? root, () => this.loadForm(c, root));
    this.ctx.bus.on('registration:intent', ({ source }) => {
      this.intent = source;
      lazy.trigger();
    });
    lazy.watch();
  }

  private async loadForm(c: ClientContainer, root: HTMLElement): Promise<void> {
    const [{ mountRegistrationForm }, services] = await Promise.all([
      import('./registration/mountRegistrationForm'),
      c.loadRegistration(),
      // as vagas ao vivo vêm da lista de equipes: sem ela o formulário monta mesmo assim
      this.teamsLazy?.ensure().catch(() => undefined),
    ]);
    const { ctx, teamsVm: teams, intent: source } = this;
    this.form = mountRegistrationForm({ root, ctx, services, clock: c.clock, teams, source });
  }

  // vitrine e contador ao vivo das equipes (bem abaixo da dobra): chunk à parte, quando a seção chega perto
  teams(c: ClientContainer): void {
    const roots = qsa('[data-teams]');
    const first = roots[0];
    if (!first) return;
    this.teamsLazy = new LazyMount(first.closest<HTMLElement>('section') ?? first, async () => {
      const { mountTeams } = await import('./teams/mountTeams');
      this.teamsVm ??= mountTeams(c, this.ctx.config.registration.slots, roots)[0] ?? null;
    });
    this.teamsLazy.watch();
  }

  // passo que precisa do container: sem ele (config quebrada) não monta
  withContainer(run: (c: ClientContainer) => void): () => void {
    return () => {
      if (this.c) run(this.c);
    };
  }
}

// um passo do boot por View, na ordem do que a pessoa vê primeiro; uma quebrada não derruba as outras
export function mountViews(ctx: AppContext, boot: BootSteps): void {
  const views = new ViewMounter(ctx);
  boot.add('views container', () => views.container());
  boot.add(
    'motion',
    views.withContainer((c) => views.motion(c)),
  );
  boot.add(
    'countdown',
    views.withContainer((c) => views.countdown(c)),
  );
  boot.add('hud', () => views.hud());
  boot.add('npc tokens', () => views.npcTokens());
  boot.add(
    'registration cta',
    views.withContainer(() => views.registrationCta()),
  );
  boot.add(
    'teams',
    views.withContainer((c) => views.teams(c)),
  );
  boot.add(
    'registration form',
    views.withContainer((c) => views.registrationForm(c)),
  );
}
