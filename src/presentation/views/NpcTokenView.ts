import type { NpcHuntViewModel } from '@presentation/view-models/npc/NpcHuntViewModel';

// [data-npc-token]: botão de verdade; achado vira aria-disabled (disabled tiraria o foco da pessoa)
export class NpcTokenView {
  private readonly button: HTMLButtonElement;
  private readonly vm: NpcHuntViewModel;
  private readonly id: string;
  private readonly label: string;

  constructor(button: HTMLButtonElement, vm: NpcHuntViewModel) {
    this.button = button;
    this.vm = vm;
    this.id = button.dataset['npcToken'] ?? '';
    this.label = button.dataset['npcLabel'] ?? button.getAttribute('aria-label') ?? 'NPC';
  }

  mount(): void {
    if (!this.id) return;
    if (this.vm.isFound(this.id)) this.showFound(false);
    this.button.addEventListener('click', () => {
      if (this.button.getAttribute('aria-disabled') === 'true') return;
      if (this.vm.markFound(this.id)) this.showFound(true);
    });
  }

  private showFound(animate: boolean): void {
    this.button.classList.add('is-found');
    this.button.setAttribute('aria-disabled', 'true');
    this.button.setAttribute('aria-label', `${this.label} (encontrado)`);
    if (!animate) return;
    this.button.classList.add('is-bursting');
    this.button.addEventListener('animationend', () => this.button.classList.remove('is-bursting'), {
      once: true,
    });
  }
}
