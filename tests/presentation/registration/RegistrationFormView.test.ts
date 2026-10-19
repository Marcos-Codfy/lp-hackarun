import { beforeEach, describe, expect, it } from 'vitest';
import { RegistrationGatewayError } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { formMarkup } from './formMarkup';
import { fillValid, setupForm, windowClosingAt } from './formSetup';

// o mínimo do RegistrationForm.astro que a View toca
const markup = (extra = '') => `
  <div data-registration-form data-status="closing">
    <p class="notice-badge" data-reg-closing-badge>Últimas horas</p>
    ${extra}
    <div class="regform__panel" data-reg-panel>
      <form data-reg-form>
        <input id="reg-name" data-field="name" />
        <div data-reg-failure hidden><p data-reg-failure-text></p><button type="button" data-reg-retry>Tentar de novo</button></div>
        <button type="submit" data-reg-submit><span class="btn__label">Confirmar inscrição</span></button>
      </form>
      <p data-reg-live></p>
    </div>
  </div>`;

const CLOSED = windowClosingAt('2026-10-31T23:59:00-03:00');

function mount(options: { window?: ReturnType<typeof windowClosingAt>; extra?: string } = {}) {
  document.body.innerHTML = markup(options.extra);
  const { vm, gateway } = setupForm(options.window ? { window: options.window } : {});
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  new RegistrationFormView(root, vm, new EventBus<AppEvents>()).mount();
  const el = (selector: string) => root.querySelector<HTMLElement>(selector);
  return { vm, gateway, root, el };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('RegistrationFormView · prazo conferido no navegador', () => {
  it('build aberto depois do prazo: mostra o aviso pronto e esconde o formulário', () => {
    const { root, el } = mount({
      window: CLOSED,
      extra:
        '<div data-reg-closed hidden><h2 tabindex="-1" data-reg-notice-title>Inscrições encerradas</h2></div>',
    });
    expect(root.dataset['status']).toBe('closed');
    expect(el('[data-reg-panel]')?.hidden).toBe(true);
    expect(el('[data-reg-closing-badge]')?.hidden).toBe(true);
    expect(el('[data-reg-closed]')?.hidden).toBe(false);
    expect(root.querySelectorAll('[data-reg-closed]')).toHaveLength(1);
  });

  it('sem o aviso pronto no HTML, monta um simples com título focável e link pra programação', () => {
    const { el } = mount({ window: CLOSED });
    const notice = el('[data-reg-closed]');
    expect(notice?.hidden).toBe(false);
    const title = notice?.querySelector<HTMLElement>('[data-reg-notice-title]');
    expect(title?.textContent).toBe('Inscrições encerradas');
    expect(title?.tagName).toBe('H2');
    expect(title?.tabIndex).toBe(-1);
    expect(notice?.querySelector('a')?.getAttribute('href')).toBe('/#programacao');
    expect(el('[data-reg-panel]')?.hidden).toBe(true);
  });

  it('dentro do prazo o formulário fica como o build mandou', () => {
    const { root, el } = mount({ window: { ...CLOSED, closesAt: '2026-11-08T23:59:00-03:00' } });
    expect(root.dataset['status']).toBe('closing');
    expect(el('[data-reg-panel]')?.hidden).toBe(false);
    expect(el('[data-reg-closed]')).toBeNull();
  });
});

describe('RegistrationFormView · falha no envio', () => {
  it('erro passageiro mostra "Tentar de novo"; e-mail repetido esconde', async () => {
    const { vm, gateway, el } = mount();
    fillValid(vm);
    gateway.willThrow(new RegistrationGatewayError('server', 'x'));
    await vm.submit();
    expect(el('[data-reg-failure]')?.hidden).toBe(false);
    expect(el('[data-reg-retry]')?.hidden).toBe(false);
    expect(el('[data-reg-failure-text]')?.textContent).not.toMatch(/recusad/i);

    gateway.willThrow(new RegistrationGatewayError('duplicate', 'x'));
    await vm.retry();
    expect(el('[data-reg-failure-text]')?.textContent).toBe('Essa inscrição já foi registrada.');
    expect(el('[data-reg-retry]')?.hidden).toBe(true);
  });
});

describe('RegistrationFormView · campos que dependem da resposta', () => {
  function mountFull() {
    document.body.innerHTML = formMarkup();
    const { vm } = setupForm();
    const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
    new RegistrationFormView(root, vm, new EventBus<AppEvents>(), () => undefined).mount();
    const el = <T extends HTMLElement = HTMLElement>(selector: string) =>
      root.querySelector<T>(selector) as T;
    const choose = (id: string) => {
      const radio = el<HTMLInputElement>(`#${id}`);
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const shown = (field: string) => !el(`[data-show-field="${field}"]`).hidden;
    return { vm, el, choose, shown };
  }

  it('sem perfil escolhido, nenhum campo de estudo ou de área aparece', () => {
    const { el, shown } = mountFull();
    expect(el('[data-profile-details]').hidden).toBe(true);
    expect(['institution', 'course', 'period', 'studentId', 'area'].some(shown)).toBe(false);
  });

  it('cada perfil mostra só os campos dele, e o radio chega no VM', () => {
    const { vm, el, choose, shown } = mountFull();
    choose('reg-profile-unicatolica');
    expect(vm.fields.profile).toBe('unicatolica');
    expect(el('[data-profile-details]').hidden).toBe(false);
    expect(['course', 'period', 'studentId'].every(shown)).toBe(true);
    expect(shown('institution') || shown('area')).toBe(false);
    choose('reg-profile-other-institution');
    expect(['institution', 'course', 'period'].every(shown)).toBe(true);
    expect(shown('studentId')).toBe(false);
    choose('reg-profile-self-taught');
    expect(shown('area')).toBe(true);
    expect(shown('course') || shown('period')).toBe(false);
  });

  it('menor de idade vê o aviso da autorização; maior não', () => {
    const { el, choose } = mountFull();
    choose('reg-adult-no');
    expect(el('[data-minor-notice]').hidden).toBe(false);
    choose('reg-adult-yes');
    expect(el('[data-minor-notice]').hidden).toBe(true);
  });

  it('erro de grupo de opções vai no fieldset, e o select manda o valor pro VM', async () => {
    const { vm, el, choose } = mountFull();
    await vm.submit();
    expect(el('#reg-profile').getAttribute('aria-invalid')).toBe('true');
    expect(el('#reg-profile-error').hidden).toBe(false);
    choose('reg-profile-graduate');
    const area = el<HTMLSelectElement>('#reg-area');
    area.value = 'security';
    area.dispatchEvent(new Event('change', { bubbles: true }));
    expect(vm.fields.area).toBe('security');
    expect(el('#reg-profile').hasAttribute('aria-invalid')).toBe(false);
  });
});
