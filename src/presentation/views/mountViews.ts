// monta as Views MVVM da LP (pausa das animações, contador, equipes, clímax da inscrição, HUD, NPCs) sobre o
// container. O formulário mora na página /inscricao (LightApp): aqui não baixa nada dele
import { createClientContainer, type ClientContainer } from '@composition/client';
import { qs, qsa } from '@shared/utils/dom';
import type { AppContext } from '@presentation/app/AppContext';
import type { BootSteps } from '@presentation/app/BootQueue';
import { LazyMount } from '@presentation/app/LazyMount';
import { CountdownViewModel } from '@presentation/view-models/countdown/CountdownViewModel';
import { HudViewModel } from '@presentation/view-models/hud/HudViewModel';
import { NpcHuntViewModel } from '@presentation/view-models/npc/NpcHuntViewModel';
import { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';
import { CountdownView } from './CountdownView';
import { ChargeRevealView } from './ChargeRevealView';
import { HudView } from './HudView';
import { NpcTokenView } from './NpcTokenView';
import { MotionPreferenceView } from './motion/MotionPreferenceView';

// guarda o container e o VM que mais de uma View usa (NPC) entre os passos do boot
class ViewMounter {
  private c: ClientContainer | null = null;
  private npc: NpcHuntViewModel | null = null;

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

  // clímax: o CTA da inscrição acende quando o globo termina de carregar (os CTAs são links pra /inscricao)
  chargeReveal(): void {
    const section = qs('#inscricao');
    if (section) new ChargeRevealView(this.ctx, section).mount();
  }

  // vitrine e contador ao vivo das equipes (bem abaixo da dobra): chunk à parte, quando a seção chega perto
  teams(c: ClientContainer): void {
    const roots = qsa('[data-teams]');
    const first = roots[0];
    if (!first) return;
    const lazy = new LazyMount(first.closest<HTMLElement>('section') ?? first, async () => {
      const { mountTeams } = await import('./teams/mountTeams');
      mountTeams(c, this.ctx.config.registration.slots, roots);
    });
    lazy.watch();
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
  boot.add('charge reveal', () => views.chargeReveal());
  boot.add(
    'teams',
    views.withContainer((c) => views.teams(c)),
  );
}
