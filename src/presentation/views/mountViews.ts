// monta as Views MVVM (pausa das animações, contador, som, equipes, inscrição, HUD, NPCs) sobre o container
import type { SlotsDTO } from '@application/index';
import { createClientContainer, type ClientContainer } from '@composition/client';
import { qs, qsa, readJsonAttr } from '@shared/utils/dom';
import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import { CountdownViewModel } from '@presentation/view-models/countdown/CountdownViewModel';
import { SoundViewModel } from '@presentation/view-models/sound/SoundViewModel';
import { TeamsViewModel, type PublicTeam } from '@presentation/view-models/teams/TeamsViewModel';
import { RegistrationFormViewModel } from '@presentation/view-models/registration/RegistrationFormViewModel';
import { HudViewModel } from '@presentation/view-models/hud/HudViewModel';
import { NpcHuntViewModel } from '@presentation/view-models/npc/NpcHuntViewModel';
import { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';
import { CountdownView } from './CountdownView';
import { SoundToggleView } from './SoundToggleView';
import { TeamsView } from './TeamsView';
import { RegistrationFormView } from './RegistrationFormView';
import { RegistrationCtaController } from './RegistrationCtaController';
import { ChargeRevealView } from './ChargeRevealView';
import { HudView } from './HudView';
import { NpcTokenView } from './NpcTokenView';
import { SoundBusBinder } from './SoundBusBinder';
import { MotionPreferenceView } from './motion/MotionPreferenceView';

// guarda o container e os VMs que mais de uma View usa (som, NPC) entre os passos do boot
class ViewMounter {
  private c: ClientContainer | null = null;
  private npc: NpcHuntViewModel | null = null;
  private form: RegistrationFormView | null = null;
  // lista ao vivo das equipes: vagas esgotadas na planilha fecham o formulário
  private teamsVm: TeamsViewModel | null = null;

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

  sound(c: ClientContainer): void {
    const { bus } = this.ctx;
    const sound = new SoundViewModel({
      store: c.preferences,
      engine: c.audio,
      cue: c.cue,
      typing: c.typing,
      bus,
    });
    qsa<HTMLButtonElement>('[data-sound-toggle]').forEach((button) =>
      new SoundToggleView(button, sound).mount(),
    );
    SoundToggleView.unlockOnFirstGesture(sound);
    new SoundBusBinder(bus, sound).mount();
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

  registrationForm(c: ClientContainer): void {
    const root = qs('[data-registration-form]');
    if (!root) return;
    const status = root.dataset['status'];
    const vm = new RegistrationFormViewModel({
      submit: c.submitRegistration,
      teamSize: this.ctx.config.registration.teamSize,
      isOpen: status === 'open' || status === 'closing',
      clock: c.clock,
    });
    this.ctx.bus.on('registration:intent', ({ source }) => vm.setSource(source));
    const view = new RegistrationFormView(root, vm, this.ctx.bus);
    view.mount();
    this.form = view;
    this.teamsVm?.state.subscribe((state) => {
      if (state.status === 'ready') vm.refreshAvailability(state.slots.taken);
    });
  }

  teams(c: ClientContainer): void {
    const fallbackSlots: SlotsDTO = this.ctx.config.registration.slots;
    qsa('[data-teams]').forEach((root) => {
      const vm = new TeamsViewModel({
        initial: readJsonAttr<PublicTeam[]>(root, 'data-teams-initial', []),
        slots: readJsonAttr<SlotsDTO>(root, 'data-teams-slots', fallbackSlots),
        listTeams: c.listTeams,
      });
      this.teamsVm ??= vm;
      new TeamsView(root, vm).mount();
    });
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
  boot.add(
    'sound',
    views.withContainer((c) => views.sound(c)),
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
