import { beforeEach, describe, expect, it } from 'vitest';
import { RegistrationGatewayError } from '@application/index';
import { MentorFormView } from '@presentation/views/mentor/MentorFormView';
import { setupMentorForm } from './mentorSetup';
import { mentorMarkup } from './mentorMarkup';

function mount(options: { status?: string; isOpen?: boolean; prefill?: () => void } = {}) {
  document.body.innerHTML = mentorMarkup(options.status);
  options.prefill?.();
  const { vm, gateway } = setupMentorForm({ isOpen: options.isOpen ?? true });
  const root = document.querySelector<HTMLElement>('[data-mentor-form]') as HTMLElement;
  const scrolled: HTMLElement[] = [];
  new MentorFormView(root, vm, (el) => scrolled.push(el)).mount();
  const el = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector) as T;
  const fire = (target: HTMLElement, type: string) =>
    target.dispatchEvent(new Event(type, { bubbles: true }));
  const type = (id: string, value: string) => {
    const input = el<HTMLInputElement>(`#${id}`);
    input.value = value;
    fire(input, 'input');
  };
  const choose = (id: string) => {
    const input = el<HTMLInputElement>(`#${id}`);
    input.checked = true;
    fire(input, 'change');
  };
  const toggle = (id: string, checked: boolean) => {
    const input = el<HTMLInputElement>(`#${id}`);
    input.checked = checked;
    fire(input, 'change');
  };
  const pick = (id: string, value: string) => {
    const select = el<HTMLSelectElement>(`#${id}`);
    select.value = value;
    fire(select, 'change');
  };
  const fillAll = () => {
    type('mentor-name', 'Ana Souza');
    type('mentor-email', 'ana.mentora@exemplo.com');
    type('mentor-whatsapp', '(63) 99999-0101');
    pick('mentor-area', 'security');
    choose('mentor-graduate-no');
    toggle('mentor-days-13', true);
    toggle('mentor-terms', true);
  };
  return { vm, gateway, root, el, type, choose, toggle, pick, fillAll, scrolled };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('MentorFormView · campos', () => {
  it('texto, lista, opções, dias e caixas chegam no VM', () => {
    const { vm, type, pick, choose, toggle } = mount();
    type('mentor-name', 'Ana Souza');
    pick('mentor-area', 'security');
    choose('mentor-graduate-no');
    toggle('mentor-days-14', true);
    toggle('mentor-days-12', true);
    toggle('mentor-may-publish', true);
    expect(vm.fields).toMatchObject({
      name: 'Ana Souza',
      area: 'security',
      graduate: 'no',
      days: ['12', '14'],
      mayPublish: true,
    });
    toggle('mentor-days-12', false);
    expect(vm.fields.days).toEqual(['14']);
  });

  it('curso e ano de formatura só aparecem para quem é egresso', () => {
    const { el, choose } = mount();
    const shown = (field: string) => !el(`[data-show-field="${field}"]`).hidden;
    expect(['course', 'graduationYear'].some(shown)).toBe(false);
    choose('mentor-graduate-yes');
    expect(['course', 'graduationYear'].every(shown)).toBe(true);
    choose('mentor-graduate-no');
    expect(['course', 'graduationYear'].some(shown)).toBe(false);
  });

  it('"Qual é a sua área?" só aparece quando a área escolhida é "Outra"', () => {
    const { vm, el, pick, type } = mount();
    const field = () => el('[data-show-field="areaOther"]');
    expect(field().hidden).toBe(true);
    pick('mentor-area', 'other');
    expect(field().hidden).toBe(false);
    type('mentor-area-other', 'Computação quântica');
    expect(vm.fields).toMatchObject({ area: 'other', areaOther: 'Computação quântica' });
    pick('mentor-area', 'security');
    expect(field().hidden).toBe(true);
  });

  it('o que já estava preenchido antes do JS (autofill, voltar no histórico) entra no VM', () => {
    const { vm } = mount({
      prefill: () => {
        (document.getElementById('mentor-email') as HTMLInputElement).value = 'ana@exemplo.com';
        (document.getElementById('mentor-days-11') as HTMLInputElement).checked = true;
        (document.getElementById('mentor-terms') as HTMLInputElement).checked = true;
      },
    });
    expect(vm.fields).toMatchObject({ email: 'ana@exemplo.com', days: ['11'], acceptedTerms: true });
  });
});

describe('MentorFormView · erros', () => {
  it('envio vazio: resumo com o título certo, links por campo, foco no resumo e rolagem', async () => {
    const { vm, el, scrolled } = mount();
    await vm.submit();
    const summary = el('[data-error-summary]');
    expect(summary.hidden).toBe(false);
    expect(el('[data-error-summary-title]').textContent).toMatch(/^Faltam ajustar \d+ campos:$/);
    const links = [...summary.querySelectorAll<HTMLAnchorElement>('a')].map((a) => a.textContent);
    expect(links[0]).toBe('Nome completo: Informe o nome completo.');
    // o aceite se chama "Termos e LGPD" no resumo (o formulário de mentor não tem regulamento)
    expect(links.some((text) => text?.startsWith('Termos e LGPD:'))).toBe(true);
    expect(document.activeElement).toBe(summary);
    expect(scrolled).toEqual([summary]);
  });

  it('erro de grupo de opções vai no fieldset e some quando a pessoa escolhe', async () => {
    const { vm, el, choose } = mount();
    await vm.submit();
    expect(el('#mentor-graduate').getAttribute('aria-invalid')).toBe('true');
    expect(el('#mentor-graduate-error').hidden).toBe(false);
    choose('mentor-graduate-no');
    expect(el('#mentor-graduate').hasAttribute('aria-invalid')).toBe(false);
    expect(el('#mentor-graduate-error').hidden).toBe(true);
  });

  it('um erro só: o foco vai direto pro campo e o leitor de tela ouve o aviso', async () => {
    const { vm, el, fillAll, toggle } = mount();
    fillAll();
    toggle('mentor-terms', false);
    await vm.submit();
    expect(document.activeElement).toBe(el('#mentor-terms'));
    expect(el('[data-reg-live]').textContent).toBe('1 campo precisa de ajuste.');
  });

  it('o link do resumo leva o foco ao campo', async () => {
    const { vm, el } = mount();
    await vm.submit();
    el<HTMLAnchorElement>('[data-error-summary] a[data-focus-path="email"]').click();
    expect(document.activeElement).toBe(el('#mentor-email'));
  });
});

describe('MentorFormView · envio', () => {
  it('sucesso: troca o formulário pela tela de sucesso, com o protocolo e o e-mail de contato', async () => {
    const { vm, el, fillAll } = mount();
    fillAll();
    await vm.submit();
    expect(el('[data-reg-form]').hidden).toBe(true);
    expect(el('[data-reg-success]').hidden).toBe(false);
    expect(el('[data-reg-protocol]').textContent).toBe('MT26-TESTE1');
    expect(el('[data-reg-contact-email]').textContent).toBe('ana.mentora@exemplo.com');
    expect(el('[data-reg-live]').textContent).toBe('Cadastro recebido. Protocolo MT26-TESTE1.');
    expect(document.activeElement).toBe(el('[data-reg-success-title]'));
  });

  it('falha passageira mostra "Tentar de novo"; e-mail repetido vira erro no campo', async () => {
    const { vm, gateway, el, fillAll } = mount();
    fillAll();
    gateway.willThrow(new RegistrationGatewayError('server', 'x'));
    await vm.submit();
    expect(el('[data-reg-failure]').hidden).toBe(false);
    expect(el('[data-reg-retry]').hidden).toBe(false);
    expect(el('[data-reg-failure-text]').textContent).toBeTruthy();

    gateway.willThrow(new RegistrationGatewayError('duplicate-email', 'x'));
    await vm.retry();
    expect(el('[data-reg-failure]').hidden).toBe(true);
    expect(el('#mentor-email-error').hidden).toBe(false);
    expect(el('#mentor-email').getAttribute('aria-invalid')).toBe('true');
  });

  it('o servidor encerrou o cadastro: o aviso pronto entra no lugar do formulário', async () => {
    const { vm, gateway, root, el, fillAll } = mount();
    fillAll();
    gateway.willThrow(new RegistrationGatewayError('closed', 'x'));
    await vm.submit();
    expect(root.dataset['status']).toBe('closed');
    expect(el('[data-reg-panel]').hidden).toBe(true);
    expect(el('[data-reg-closed]').hidden).toBe(false);
  });

  it('o botão de envio vira "Enviando" e fica desabilitado até a resposta', async () => {
    const { vm, el, fillAll } = mount();
    fillAll();
    const sending = vm.submit();
    expect(el('[data-reg-submit]').getAttribute('aria-disabled')).toBe('true');
    expect(el('[data-reg-submit] .btn__label').textContent).toBe('Enviando');
    await sending;
  });
});

describe('MentorFormView · cadastro que não aceita envio', () => {
  it('build "em breve" (isOpen falso): a View não liga nada e o VM não envia', async () => {
    const { vm, gateway, el, type } = mount({ status: 'soon', isOpen: false });
    type('mentor-name', 'Ana Souza');
    expect(vm.fields.name).toBe('');
    el('[data-reg-form]').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(gateway.calls).toHaveLength(0);
  });
});
