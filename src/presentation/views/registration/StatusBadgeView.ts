import { qs } from '@shared/utils/dom';
import type { RegistrationFormViewModel } from '@presentation/view-models/registration/RegistrationFormViewModel';

// [data-reg-status]: o selo do topo da página acompanha o formulário. Página gerada antes do prazo e aberta
// depois dele (ou com as vagas esgotadas na planilha): o formulário fecha e o selo vira "Encerradas"
export class StatusBadgeView {
  constructor(
    private readonly root: HTMLElement,
    private readonly vm: RegistrationFormViewModel,
  ) {}

  mount(): void {
    this.vm.state.subscribe((state) => {
      if (state.open || this.root.dataset['state'] === 'closed') return;
      if (this.root.dataset['state'] === 'soon') return;
      this.root.dataset['state'] = 'closed';
      const badge = qs('[data-reg-status-badge]', this.root);
      if (badge) badge.textContent = 'Encerradas';
      const countdown = qs('[data-reg-status-countdown]', this.root);
      if (countdown) countdown.hidden = true;
    });
  }
}
