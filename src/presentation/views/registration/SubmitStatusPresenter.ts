import { SIMULATION_ENABLED } from '@shared/config/registrationMode';
import type { EventBus } from '@shared/core/EventBus';
import { qs } from '@shared/utils/dom';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { RegistrationFormState } from '@presentation/view-models/registration/RegistrationFormViewModel';
import { ProtocolReveal } from './ProtocolReveal';

// botão de envio, caixa de falha e tela de sucesso; o live region é dele
export class SubmitStatusPresenter {
  private readonly root: HTMLElement;
  private readonly bus: EventBus<AppEvents>;

  constructor(root: HTMLElement, bus: EventBus<AppEvents>) {
    this.root = root;
    this.bus = bus;
  }

  render(state: RegistrationFormState): void {
    const submitting = state.status === 'submitting';
    this.root.classList.toggle('is-submitting', submitting);
    const submit = qs('[data-reg-submit]', this.root);
    submit?.setAttribute('aria-disabled', String(submitting));
    const label = submit ? qs('.btn__label', submit) : null;
    if (label) label.textContent = submitting ? 'Enviando' : 'Confirmar inscrição';
    const failure = qs('[data-reg-failure]', this.root);
    if (failure) failure.hidden = state.status !== 'error';
    const failureText = qs('[data-reg-failure-text]', this.root);
    if (failureText) failureText.textContent = state.failure ?? '';
    // encerrada, e-mail repetido ou recusada: repetir igual não adianta, o caminho é corrigir e reenviar
    const retry = qs('[data-reg-retry]', this.root);
    if (retry) retry.hidden = !state.retryable;
    if (submitting) this.announce('Enviando inscrição…');
    if (state.status === 'success') this.showSuccess(state);
  }

  announce(text: string): void {
    const live = qs('[data-reg-live]', this.root);
    if (live) live.textContent = text;
  }

  private showSuccess(state: RegistrationFormState): void {
    const protocol = state.protocol ?? '';
    const form = qs('[data-reg-form]', this.root);
    const success = qs('[data-reg-success]', this.root);
    if (!form || !success) return;
    // cópia fiel pro leitor de tela; a visível "decodifica"
    const code = qs('[data-reg-protocol]', success);
    if (code) code.textContent = protocol;
    // é por esse e-mail que a organização fala com a pessoa (comunicação oficial)
    const mail = qs('[data-reg-contact-email]', success);
    if (mail) mail.textContent = state.fields.email.trim().toLowerCase() || 'o seu e-mail';
    // menor de idade: o lembrete da autorização do responsável aparece no sucesso
    const guardian = qs('[data-reg-guardian]', success);
    if (guardian) guardian.hidden = !state.needsGuardianConsent;
    const typed = qs('[data-reg-protocol-typed]', success);
    form.hidden = true;
    success.hidden = false;
    // prévia simulada (data-simulated no formulário): quem ouve a tela também fica sabendo que nada foi gravado.
    // Build sem simulação: SIMULATION_ENABLED vira false e o texto simulado nem entra no bundle
    const simulated = SIMULATION_ENABLED && this.root.dataset['simulated'] === 'true';
    this.announce(
      simulated
        ? `Inscrição simulada recebida. Protocolo ${protocol}. Nada foi gravado na planilha.`
        : `Inscrição recebida. Protocolo ${protocol}.`,
    );
    qs('[data-reg-success-title]', success)?.focus();
    if (typed) new ProtocolReveal(typed).play(protocol);
    this.bus.emit('registration:submitted', { protocol });
  }
}
