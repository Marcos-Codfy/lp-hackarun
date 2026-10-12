import { beforeEach, describe, expect, it } from 'vitest';
import { RegistrationGatewayError } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { fillValidTeam, setupForm, windowClosingAt } from './formSetup';

// o mínimo do RegistrationForm.astro que a View toca
const markup = (extra = '') => `
  <div data-registration-form data-status="closing" data-team-min="2" data-team-max="5">
    <p class="notice-badge" data-reg-closing-badge>Últimas horas</p>
    ${extra}
    <div class="regform__panel" data-reg-panel>
      <form data-reg-form>
        <input id="reg-team-name" data-field="teamName" />
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
        '<div data-reg-closed hidden><h3 tabindex="-1" data-reg-notice-title>Inscrições encerradas</h3></div>',
    });
    expect(root.dataset['status']).toBe('closed');
    expect(el('[data-reg-panel]')?.hidden).toBe(true);
    expect(el('[data-reg-closing-badge]')?.hidden).toBe(true);
    expect(el('[data-reg-closed]')?.hidden).toBe(false);
    expect(root.querySelectorAll('[data-reg-closed]')).toHaveLength(1);
  });

  it('sem o aviso pronto no HTML, monta um simples com título focável e link pras equipes', () => {
    const { el } = mount({ window: CLOSED });
    const notice = el('[data-reg-closed]');
    expect(notice?.hidden).toBe(false);
    const title = notice?.querySelector<HTMLElement>('[data-reg-notice-title]');
    expect(title?.textContent).toBe('Inscrições encerradas');
    expect(title?.tabIndex).toBe(-1);
    expect(notice?.querySelector('a')?.getAttribute('href')).toBe('/equipes');
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
    fillValidTeam(vm);
    gateway.willThrow(new RegistrationGatewayError('server', 'x'));
    await vm.submit();
    expect(el('[data-reg-failure]')?.hidden).toBe(false);
    expect(el('[data-reg-retry]')?.hidden).toBe(false);
    expect(el('[data-reg-failure-text]')?.textContent).not.toMatch(/recusad/i);

    gateway.willThrow(new RegistrationGatewayError('duplicate', 'x'));
    await vm.retry();
    expect(el('[data-reg-failure-text]')?.textContent).toBe('Essa equipe já tem uma inscrição registrada.');
    expect(el('[data-reg-retry]')?.hidden).toBe(true);
  });
});
