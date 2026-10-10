// monta as Views MVVM (contador, som, equipes, inscrição, HUD, NPCs) em cima do container do cliente
import type { SlotsDTO } from '@application/index';
import { createClientContainer, type ClientContainer } from '@composition/client';
import { qs, qsa, readJsonAttr } from '@shared/utils/dom';
import type { AppContext } from '@presentation/app/AppContext';
import { CountdownViewModel } from '@presentation/view-models/countdown/CountdownViewModel';
import { SoundViewModel } from '@presentation/view-models/sound/SoundViewModel';
import { TeamsViewModel, type PublicTeam } from '@presentation/view-models/teams/TeamsViewModel';
import { RegistrationFormViewModel } from '@presentation/view-models/registration/RegistrationFormViewModel';
import { HudViewModel } from '@presentation/view-models/hud/HudViewModel';
import { NpcHuntViewModel } from '@presentation/view-models/npc/NpcHuntViewModel';
import { CountdownView } from './CountdownView';
import { SoundToggleView } from './SoundToggleView';
import { TeamsView } from './TeamsView';
import { RegistrationFormView } from './RegistrationFormView';
import { RegistrationCtaController } from './RegistrationCtaController';
import { ChargeRevealView } from './ChargeRevealView';
import { HudView } from './HudView';
import { NpcTokenView } from './NpcTokenView';
import { SoundBusBinder } from './SoundBusBinder';

// uma View quebrada não pode derrubar as outras
function safely(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.error(`[views] ${name} failed`, error);
  }
}

function mountRegistration(ctx: AppContext, c: ClientContainer): RegistrationFormView | null {
  const root = qs('[data-registration-form]');
  if (!root) return null;
  const status = root.dataset['status'];
  const vm = new RegistrationFormViewModel({
    submit: c.submitRegistration,
    teamSize: ctx.config.registration.teamSize,
    isOpen: status === 'open' || status === 'closing',
    clock: c.clock,
  });
  ctx.bus.on('registration:intent', ({ source }) => vm.setSource(source));
  const view = new RegistrationFormView(root, vm, ctx.bus);
  view.mount();
  return view;
}

function mountTeams(c: ClientContainer, fallbackSlots: SlotsDTO): void {
  qsa('[data-teams]').forEach((root) => {
    const vm = new TeamsViewModel({
      initial: readJsonAttr<PublicTeam[]>(root, 'data-teams-initial', []),
      slots: readJsonAttr<SlotsDTO>(root, 'data-teams-slots', fallbackSlots),
      listTeams: c.listTeams,
    });
    new TeamsView(root, vm).mount();
  });
}

function createContainer(ctx: AppContext): ClientContainer | null {
  try {
    return createClientContainer(ctx.config, { dev: import.meta.env.DEV });
  } catch (error) {
    // config quebrada (data inválida...): a página continua legível só com o HTML
    console.error('[views] client container failed', error);
    return null;
  }
}

export function mountViews(ctx: AppContext): void {
  const c = createContainer(ctx);
  if (!c) return;
  const sound = new SoundViewModel({
    store: c.preferences,
    engine: c.audio,
    cue: c.cue,
    typing: c.typing,
    bus: ctx.bus,
  });
  const npc = new NpcHuntViewModel({ store: c.preferences, bus: ctx.bus });

  safely('countdown', () =>
    qsa('[data-countdown]').forEach((root) => {
      const vm = new CountdownViewModel(c.getCountdown, c.clock);
      new CountdownView(root, vm, { calm: ctx.reducedMotion }).mount();
    }),
  );
  safely('sound', () => {
    qsa<HTMLButtonElement>('[data-sound-toggle]').forEach((button) =>
      new SoundToggleView(button, sound).mount(),
    );
    SoundToggleView.unlockOnFirstGesture(sound);
    new SoundBusBinder(ctx.bus, sound).mount();
  });
  safely('teams', () => mountTeams(c, ctx.config.registration.slots));
  safely('registration', () => {
    const form = mountRegistration(ctx, c);
    new RegistrationCtaController(ctx, () => form?.focusEntry() ?? false).mount();
    const section = qs('#inscricao');
    if (section) new ChargeRevealView(ctx, section).mount();
  });
  safely('npc', () =>
    qsa<HTMLButtonElement>('[data-npc-token]').forEach((b) => new NpcTokenView(b, npc).mount()),
  );
  safely('hud', () => {
    const root = qs('[data-hud]');
    const sections = qsa('[data-checkpoint]');
    if (!root) return;
    const vm = new HudViewModel(sections.map((s) => s.dataset['checkpoint'] ?? ''));
    new HudView(root, { vm, npc, sections }).mount();
  });
}
