import { beforeEach, describe, expect, it } from 'vitest';
import { RegistrationGatewayError } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { fillMember, fillValidTeam, setupForm } from './formSetup';

const field = (name: string, label: string) => `
  <div class="field">
    <label for="member-__KEY__-${name}">${label}</label>
    <input id="member-__KEY__-${name}" data-member-field="${name}" />
    <p id="member-__KEY__-${name}-error" data-member-error="${name}" hidden></p>
  </div>`;

// o essencial do RegistrationForm.astro + MemberList + MemberRow que a View toca
const MARKUP = `
  <div data-registration-form data-status="open" data-team-min="2" data-team-max="5">
    <div data-reg-panel>
      <span data-reg-squad></span>
      <form data-reg-form>
        <div data-error-summary hidden><p data-error-summary-title></p><ul data-error-summary-list></ul></div>
        <label for="reg-team-name">Nome da equipe</label>
        <input id="reg-team-name" data-field="teamName" />
        <p id="reg-team-name-error" data-error-for="teamName" hidden></p>
        <span data-member-count></span>
        <ol data-members-list></ol>
        <p data-error-for="members" hidden></p>
        <button type="button" data-member-add><span data-member-add-label></span></button>
        <template data-member-template>
          <li data-member-row><fieldset>
            <legend><span data-member-title></span><span data-contact-only hidden>contato da equipe</span></legend>
            <button type="button" data-member-remove>Remover</button>
            <p data-contact-only hidden>nota do contato</p>
            ${field('name', 'Nome completo')}${field('studentId', 'Matrícula')}${field('email', 'E-mail')}
          </fieldset></li>
        </template>
        <div data-reg-failure hidden><p data-reg-failure-text></p><button type="button" data-reg-retry></button></div>
        <button type="submit" data-reg-submit><span class="btn__label">Confirmar inscrição</span></button>
      </form>
      <div data-reg-success hidden>
        <h3 tabindex="-1" data-reg-success-title></h3>
        <span data-reg-protocol></span><span data-reg-protocol-typed></span>
        <strong data-reg-contact-email></strong>
      </div>
      <p data-reg-live></p>
    </div>
  </div>`;

function mount() {
  document.body.innerHTML = MARKUP;
  const { vm, gateway } = setupForm();
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  new RegistrationFormView(root, vm, new EventBus<AppEvents>()).mount();
  const el = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('[data-member-row]'));
  return { vm, gateway, root, el, rows };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('RegistrationFormView · cards de integrante', () => {
  it('monta o mínimo de cards; o integrante 1 é o contato e não tem "Remover"', () => {
    const { rows, el } = mount();
    expect(rows()).toHaveLength(2);
    const [contact, second] = rows();
    expect(contact?.querySelector('[data-member-title]')?.textContent).toBe('Integrante 1');
    expect(contact?.querySelector<HTMLElement>('[data-contact-only]')?.hidden).toBe(false);
    expect(contact?.querySelector<HTMLButtonElement>('[data-member-remove]')?.hidden).toBe(true);
    expect(second?.querySelector<HTMLElement>('[data-contact-only]')?.hidden).toBe(true);
    // no mínimo, ninguém sai
    expect(second?.querySelector<HTMLButtonElement>('[data-member-remove]')?.disabled).toBe(true);
    expect(el('[data-member-count]')?.textContent).toBe('2/5');
    expect(el('[data-reg-squad]')?.textContent).toBe('Esquadrão 2/5');
    // ids únicos por card (label for, erro e describedby batem)
    const ids = rows().flatMap((r) => Array.from(r.querySelectorAll('input')).map((i) => i.id));
    expect(new Set(ids).size).toBe(6);
  });

  it('teclado: adicionar foca o card novo e avisa; no máximo o botão trava com o motivo', () => {
    const { rows, el } = mount();
    el<HTMLButtonElement>('[data-member-add]')?.click();
    expect(rows()).toHaveLength(3);
    expect(document.activeElement).toBe(rows()[2]?.querySelector('[data-member-field="name"]'));
    expect(el('[data-reg-live]')?.textContent).toBe(
      'Integrante 3 adicionado. A equipe tem 3 de 5 integrantes.',
    );
    el<HTMLButtonElement>('[data-member-add]')?.click();
    el<HTMLButtonElement>('[data-member-add]')?.click();
    expect(el<HTMLButtonElement>('[data-member-add]')?.disabled).toBe(true);
    expect(el('[data-member-add-label]')?.textContent).toBe('Equipe completa · 5/5');
    expect(rows()[4]?.querySelector('[data-member-remove]')?.getAttribute('aria-label')).toBe(
      'Remover integrante 5',
    );
  });

  it('teclado: remover leva o foco pro card que subiu (ou pro "Adicionar") e o texto digitado acompanha', () => {
    const { vm, rows, el } = mount();
    vm.addMember();
    vm.addMember();
    fillMember(vm, 3);
    rows()[3]
      ?.querySelectorAll('input')
      .forEach((input, i) => {
        input.value = Object.values(vm.fields.members[3] ?? {}).slice(1)[i] as string;
      });
    rows()[2]?.querySelector<HTMLButtonElement>('[data-member-remove]')?.click();
    expect(rows()).toHaveLength(3);
    const moved = rows()[2]?.querySelector<HTMLInputElement>('[data-member-field="name"]');
    expect(document.activeElement).toBe(moved);
    expect(moved?.value).toBe('Davi Rocha');
    expect(rows()[2]?.querySelector('[data-member-title]')?.textContent).toBe('Integrante 3');
    expect(el('[data-reg-live]')?.textContent).toBe(
      'Integrante 3 removido. A equipe tem 3 de 5 integrantes.',
    );
    rows()[2]?.querySelector<HTMLButtonElement>('[data-member-remove]')?.click();
    expect(document.activeElement).toBe(el('[data-member-add]'));
  });

  it('erro no campo do integrante: aria-invalid, aria-describedby e o resumo com "Integrante 2 · Matrícula"', async () => {
    const { vm, rows, el } = mount();
    fillValidTeam(vm);
    vm.setText('members.1.studentId', '12');
    await vm.submit();
    const input = rows()[1]?.querySelector<HTMLInputElement>('[data-member-field="studentId"]');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe(`${input?.id}-error`);
    expect(document.getElementById(`${input?.id}-error`)?.textContent).toBe(
      'A matrícula tem de 4 a 20 caracteres.',
    );
    expect(el('[data-error-summary]')?.hidden).toBe(false);
    expect(el('[data-error-summary-list]')?.textContent).toBe(
      'Integrante 2 · Matrícula: A matrícula tem de 4 a 20 caracteres.',
    );
    expect(document.activeElement).toBe(input);
  });

  it('e-mail já inscrito em outra equipe: o campo certo fica inválido e ganha o foco', async () => {
    const { vm, gateway, rows } = mount();
    fillValidTeam(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate-email', 'x', [1]));
    await vm.submit();
    const email = rows()[1]?.querySelector<HTMLInputElement>('[data-member-field="email"]');
    expect(email?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(email);
    expect(document.getElementById(`${email?.id}-error`)?.textContent).toBe(
      'Esse e-mail já está em outra equipe inscrita.',
    );
  });

  it('sucesso mostra o e-mail do contato, canal oficial da organização', async () => {
    const { vm, el } = mount();
    fillValidTeam(vm);
    await vm.submit();
    expect(el('[data-reg-success]')?.hidden).toBe(false);
    expect(el('[data-reg-contact-email]')?.textContent).toBe('ana@exemplo.com');
    expect(el('[data-reg-form]')?.hidden).toBe(true);
  });
});
