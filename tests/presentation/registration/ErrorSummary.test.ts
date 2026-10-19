// resumo de erros: uma linha por campo, com o rótulo (ou a pergunta) e a frase exata, levando até ele
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegistrationGatewayError } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { formMarkup } from './formMarkup';
import { fillValid, setupForm } from './formSetup';

function mount() {
  document.body.innerHTML = formMarkup();
  const form = setupForm();
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  new RegistrationFormView(root, form.vm, new EventBus<AppEvents>(), vi.fn()).mount();
  const items = () =>
    Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-error-summary-list] a'), (a) => ({
      text: a.textContent,
      path: a.dataset['focusPath'],
    }));
  const title = () => root.querySelector('[data-error-summary-title]')?.textContent;
  return { ...form, root, items, title };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('resumo de erros na tela', () => {
  it('envio vazio: uma linha por campo obrigatório, na ordem do formulário', async () => {
    const { vm, items, title } = mount();
    await vm.submit();
    expect(title()).toBe('Faltam ajustar 6 campos:');
    expect(items()).toEqual([
      { text: 'Nome completo: Informe o nome completo.', path: 'name' },
      { text: 'E-mail: Informe o e-mail.', path: 'email' },
      { text: 'WhatsApp: Informe o WhatsApp com DDD.', path: 'whatsapp' },
      { text: 'Você tem 18 anos ou mais?: Responda se você tem 18 anos ou mais.', path: 'adult' },
      { text: 'Você estuda atualmente?: Escolha a opção que mais combina com você.', path: 'profile' },
      {
        text: 'Regulamento e LGPD: É preciso concordar com o regulamento e o uso dos dados.',
        path: 'acceptedTerms',
      },
    ]);
  });

  it('erro do servidor num campo só: título no singular e a frase exata', async () => {
    const { vm, gateway, items, title } = mount();
    fillValid(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate-student-id', 'x'));
    await vm.submit();
    expect(title()).toBe('Falta ajustar 1 campo:');
    expect(items()).toEqual([
      { text: 'Matrícula na UniCatólica: Essa matrícula já tem uma inscrição.', path: 'studentId' },
    ]);
  });

  it('o link do resumo leva o foco pro campo', async () => {
    const { vm, root } = mount();
    vm.setValue('profile', 'graduate');
    await vm.submit();
    const link = root.querySelector<HTMLAnchorElement>('[data-focus-path="course"]');
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(document.activeElement?.id).toBe('reg-course');
  });
});
