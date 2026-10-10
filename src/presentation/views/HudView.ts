import { qs } from '@shared/utils/dom';
import {
  formatCheckpoint,
  type HudState,
  type HudViewModel,
} from '@presentation/view-models/hud/HudViewModel';
import {
  NPC_SECRET,
  type NpcHuntState,
  type NpcHuntViewModel,
} from '@presentation/view-models/npc/NpcHuntViewModel';

const SECRET_VISIBLE_MS = 14_000;

// [data-hud]: checkpoint via IntersectionObserver, barra via scroll passivo + rAF, NPCs pelo VM
export class HudView {
  private readonly root: HTMLElement;
  private readonly vm: HudViewModel;
  private readonly npc: NpcHuntViewModel;
  private readonly sections: readonly HTMLElement[];
  private frame = 0;

  constructor(
    root: HTMLElement,
    deps: { vm: HudViewModel; npc: NpcHuntViewModel; sections: readonly HTMLElement[] },
  ) {
    this.root = root;
    this.vm = deps.vm;
    this.npc = deps.npc;
    this.sections = deps.sections;
  }

  mount(): void {
    if (this.sections.length > 0) {
      this.vm.state.subscribe((state) => this.render(state));
      this.watchCheckpoints();
      this.watchScroll();
    }
    this.npc.state.subscribe((state, prev) => this.renderNpc(state, prev));
    this.root.classList.add('is-ready');
  }

  private render(state: HudState): void {
    const checkpoint = qs('[data-hud-checkpoint]', this.root);
    const text = formatCheckpoint(state);
    if (checkpoint && checkpoint.textContent !== text) checkpoint.textContent = text;
    qs('[data-hud-fill]', this.root)?.style.setProperty('transform', `scaleX(${state.progress})`);
  }

  // linha no meio da tela: a seção que cruza ela é o checkpoint atual
  private watchCheckpoints(): void {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) this.vm.enter(this.sections.indexOf(hit.target as HTMLElement));
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    this.sections.forEach((s) => observer.observe(s));
  }

  private watchScroll(): void {
    const measure = () => {
      this.frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      this.vm.setProgress(max > 0 ? window.scrollY / max : 0);
    };
    const schedule = () => {
      if (!this.frame) this.frame = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    measure();
  }

  private renderNpc(state: NpcHuntState, prev: NpcHuntState): void {
    const counter = qs('[data-hud-npc]', this.root);
    if (counter) counter.hidden = state.found.length === 0;
    const count = qs('[data-hud-npc-count]', this.root);
    if (count) count.textContent = String(state.found.length);
    const isNew = state.found.length > prev.found.length;
    if (!isNew) return;
    if (state.allFound) this.revealSecret();
    else this.announce(`NPC encontrado: ${state.found.length} de ${state.total}.`);
  }

  private revealSecret(): void {
    const secret = qs('[data-hud-secret]', this.root);
    this.announce(NPC_SECRET);
    if (!secret) return;
    secret.textContent = `// ${NPC_SECRET}`;
    secret.hidden = false;
    secret.classList.add('is-revealed');
    setTimeout(() => {
      secret.hidden = true;
    }, SECRET_VISIBLE_MS);
  }

  private announce(text: string): void {
    const live = qs('[data-hud-live]', this.root);
    if (live) live.textContent = text;
  }
}
