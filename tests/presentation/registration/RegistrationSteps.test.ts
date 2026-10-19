// as 3 etapas num envio só: o indicador marca as prontas (sem erro de validação, tocadas ou não) e a atual
// (a do foco; sem foco, a primeira que falta). O link da etapa rola até ela sem mexer no endereço
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { StepProgressView } from '@presentation/views/registration/StepProgressView';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { stepStates } from '@presentation/view-models/registration/registrationSteps';
import { fillValid, setupForm } from './formSetup';

describe('etapas · prontas', () => {
  it('formulário vazio: nenhuma pronta; seus dados ficam prontos com nome, e-mail, WhatsApp e idade', () => {
    const { vm } = setupForm();
    expect(vm.state.value.steps).toEqual([false, false, false]);
    vm.setValue('name', 'Ana Souza');
    vm.setValue('email', 'ana@exemplo.com');
    vm.setValue('whatsapp', '63999991234');
    expect(vm.state.value.steps[0]).toBe(false);
    vm.setValue('adult', 'no');
    expect(vm.state.value.steps).toEqual([true, false, false]);
  });

  it('perfil só fica pronto com os campos que ele pede; aceite fecha a 03', () => {
    const { vm } = setupForm();
    vm.setValue('profile', 'other-institution');
    expect(vm.state.value.steps[1]).toBe(false);
    vm.setValue('course', 'Direito');
    vm.setValue('period', '2');
    expect(vm.state.value.steps[1]).toBe(true);
    vm.setValue('profile', 'graduate');
    expect(vm.state.value.steps[1]).toBe(false);
    vm.setAcceptedTerms(true);
    expect(vm.state.value.steps).toEqual([false, false, true]);
  });

  it('WhatsApp já inscrito (conflito do servidor) reabre a etapa 01', async () => {
    const { vm, gateway } = setupForm();
    fillValid(vm);
    expect(vm.state.value.steps).toEqual([true, true, true]);
    const { RegistrationGatewayError } = await import('@application/index');
    gateway.willThrow(new RegistrationGatewayError('duplicate-whatsapp', 'x'));
    await vm.submit();
    expect(vm.state.value.steps[0]).toBe(false);
  });

  it('atual: a do foco; sem foco, a primeira que falta (tudo pronto, a última)', () => {
    expect(stepStates([true, false, false], null).map((s) => s.current)).toEqual([false, true, false]);
    expect(stepStates([true, false, false], 2).map((s) => s.current)).toEqual([false, false, true]);
    expect(stepStates([true, true, true], null).map((s) => s.current)).toEqual([false, false, true]);
    expect(stepStates([true, true, false], 0)[0]).toEqual({ done: true, current: true });
  });
});

const markup = `
  <div data-form-progress>
    <span data-step-done>0</span>
    <ol>${[0, 1, 2]
      .map(
        (i) => `<li data-step-item="${i}"><a href="#reg-step-0${i + 1}">x<span data-step-sr></span></a></li>`,
      )
      .join('')}</ol>
  </div>
  <div data-registration-form data-status="open">
    <form data-reg-form>
      <fieldset id="reg-step-01" data-step="0"><input id="reg-name" data-field="name" /></fieldset>
      <fieldset id="reg-step-02" data-step="1">
        <div data-show-field="institution" hidden><input id="reg-institution" data-field="institution" /></div>
        <input type="radio" id="reg-profile-graduate" name="profile" value="graduate" data-field="profile" />
      </fieldset>
      <fieldset id="reg-step-03" data-step="2"><input id="reg-terms" type="checkbox" data-field="acceptedTerms" /></fieldset>
    </form>
    <div data-error-summary tabindex="-1" hidden><p data-error-summary-title></p><ul data-error-summary-list></ul></div>
  </div>`;

describe('StepProgressView', () => {
  beforeEach(() => {
    document.body.innerHTML = markup;
    history.replaceState(null, '', '/inscricao');
  });

  function mount() {
    const { vm } = setupForm();
    const root = document.querySelector<HTMLElement>('[data-form-progress]') as HTMLElement;
    const form = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
    new RegistrationFormView(form, vm, new EventBus<AppEvents>(), vi.fn()).mount();
    new StepProgressView(root, form, vm, true).mount();
    const item = (i: number) => root.querySelectorAll<HTMLElement>('[data-step-item]')[i] as HTMLElement;
    return { vm, root, item };
  }

  it('marca pronta, atual (aria-current="step") e a contagem; o foco muda a atual', () => {
    const { vm, root, item } = mount();
    expect(item(0).querySelector('a')?.getAttribute('aria-current')).toBe('step');
    vm.setValue('name', 'Ana Souza');
    vm.setValue('email', 'ana@exemplo.com');
    vm.setValue('whatsapp', '63999991234');
    vm.setValue('adult', 'yes');
    expect(item(0).hasAttribute('data-done')).toBe(true);
    expect(item(0).querySelector('[data-step-sr]')?.textContent).toBe(', pronta');
    expect(item(1).querySelector('a')?.getAttribute('aria-current')).toBe('step');
    expect(root.querySelector('[data-step-done]')?.textContent).toBe('1');
    document.querySelector<HTMLInputElement>('#reg-terms')?.focus();
    expect(item(2).hasAttribute('data-current')).toBe(true);
    expect(item(1).querySelector('a')?.hasAttribute('aria-current')).toBe(false);
  });

  it('foco fora das etapas (o resumo de erros do envio vazio): a atual volta pra 1ª que falta e as com erro acendem', async () => {
    const { vm, item } = mount();
    document.querySelector<HTMLInputElement>('#reg-terms')?.focus();
    expect(item(2).hasAttribute('data-current')).toBe(true);
    await vm.submit();
    document.querySelector<HTMLElement>('[data-error-summary]')?.focus();
    expect(item(0).querySelector('a')?.getAttribute('aria-current')).toBe('step');
    expect(item(2).hasAttribute('data-current')).toBe(false);
    expect([0, 1, 2].map((i) => item(i).hasAttribute('data-invalid'))).toEqual([true, true, true]);
    expect(item(1).querySelector('[data-step-sr]')?.textContent).toBe(', com campos a ajustar');
  });

  it('link da etapa rola até ela e foca o 1º campo, sem entrada nova no histórico', () => {
    const { item } = mount();
    const scroll = vi.fn();
    const step = document.getElementById('reg-step-02') as HTMLElement;
    step.scrollIntoView = scroll;
    const before = history.length;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    item(1).querySelector('a')?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    // a instituição vem antes, mas está escondida pelo perfil: o foco vai pra primeira opção
    expect(document.activeElement?.id).toBe('reg-profile-graduate');
    expect(history.length).toBe(before);
    expect(location.hash).toBe('');
  });

  it('some com o formulário enviado', async () => {
    const { vm, root } = mount();
    fillValid(vm);
    await vm.submit();
    expect(root.hidden).toBe(true);
  });
});
