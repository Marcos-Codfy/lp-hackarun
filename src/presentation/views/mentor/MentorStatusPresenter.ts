import { SIMULATION_ENABLED } from '@shared/config/registrationMode';
import { qs } from '@shared/utils/dom';
import type { MentorFormState } from '@presentation/view-models/mentor/MentorFormViewModel';
import { ProtocolReveal } from '../registration/ProtocolReveal';

// botão de envio, caixa de falha e tela de sucesso do cadastro de mentor; o live region é dele
export class MentorStatusPresenter {
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  render(state: MentorFormState): void {
    const submitting = state.status === 'submitting';
    this.root.classList.toggle('is-submitting', submitting);
    const submit = qs('[data-reg-submit]', this.root);
    submit?.setAttribute('aria-disabled', String(submitting));
    const label = submit ? qs('.btn__label', submit) : null;
    if (label) label.textContent = submitting ? 'Enviando' : 'Enviar cadastro';
    const failure = qs('[data-reg-failure]', this.root);
    if (failure) failure.hidden = state.status !== 'error';
    const failureText = qs('[data-reg-failure-text]', this.root);
    if (failureText) failureText.textContent = state.failure ?? '';
    // recusado ou encerrado: repetir igual não adianta, o caminho é corrigir e reenviar
    const retry = qs('[data-reg-retry]', this.root);
    if (retry) retry.hidden = !state.retryable;
    if (submitting) this.announce('Enviando cadastro…');
    if (state.status === 'success') this.showSuccess(state);
  }

  announce(text: string): void {
    const live = qs('[data-reg-live]', this.root);
    if (live) live.textContent = text;
  }

  private showSuccess(state: MentorFormState): void {
    const protocol = state.protocol ?? '';
    const form = qs('[data-reg-form]', this.root);
    const success = qs('[data-reg-success]', this.root);
    if (!form || !success) return;
    // cópia fiel pro leitor de tela; a visível "decodifica"
    const code = qs('[data-reg-protocol]', success);
    if (code) code.textContent = protocol;
    // é por esse e-mail que a organização fala com a pessoa
    const mail = qs('[data-reg-contact-email]', success);
    if (mail) mail.textContent = state.fields.email.trim().toLowerCase() || 'o seu e-mail';
    const typed = qs('[data-reg-protocol-typed]', success);
    form.hidden = true;
    success.hidden = false;
    // prévia simulada (data-simulated no formulário): quem ouve a tela também fica sabendo que nada foi gravado.
    // Build sem simulação: SIMULATION_ENABLED vira false e o texto simulado nem entra no bundle
    const simulated = SIMULATION_ENABLED && this.root.dataset['simulated'] === 'true';
    this.announce(
      simulated
        ? `Cadastro simulado recebido. Protocolo ${protocol}. Nada foi gravado na planilha.`
        : `Cadastro recebido. Protocolo ${protocol}.`,
    );
    qs('[data-reg-success-title]', success)?.focus();
    if (typed) new ProtocolReveal(typed).play(protocol);
  }
}
