// cards do mínimo da equipe já vêm no HTML (prévia "em breve" e antes do chunk da inscrição chegar):
// a View adota esses cards em vez de clonar outros, e o que já foi digitado neles vai pro VM
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { setupForm } from './formSetup';

const field = (key: string, name: string, label: string, autocomplete = 'off') => `
  <div class="field">
    <label for="member-${key}-${name}">${label}</label>
    <input id="member-${key}-${name}" data-member-field="${name}" autocomplete="${autocomplete}" />
    <p id="member-${key}-${name}-error" hidden></p>
  </div>`;

// mesmo HTML do MemberRow: chave numérica nos cards do servidor, __KEY__ no molde
const row = (key: number | '__KEY__') => {
  const k = String(key);
  const attrs = typeof key === 'number' ? ` data-member-key="${k}"` : '';
  const contact = key === 0;
  return `<li data-member-row${attrs}><fieldset>
    <legend><span data-member-title>Integrante ${typeof key === 'number' ? key + 1 : ''}</span>
    <span data-contact-only ${contact ? '' : 'hidden'}>contato da equipe</span></legend>
    <button type="button" data-member-remove ${contact ? 'hidden' : ''} disabled>Remover</button>
    ${field(k, 'name', 'Nome completo', contact ? 'name' : 'off')}${field(k, 'studentId', 'Matrícula')}
    ${field(k, 'email', 'E-mail', contact ? 'email' : 'off')}
  </fieldset></li>`;
};

const MARKUP = `
  <div data-registration-form data-status="open" data-team-min="2" data-team-max="5">
    <div data-reg-panel>
      <span data-reg-squad></span>
      <form data-reg-form>
        <div data-error-summary tabindex="-1" hidden>
          <p data-error-summary-title></p><ul data-error-summary-list></ul>
        </div>
        <label for="reg-team-name">Nome da equipe</label>
        <input id="reg-team-name" data-field="teamName" />
        <p id="reg-team-name-error" hidden></p>
        <span data-member-count></span>
        <ol data-members-list>${row(0)}${row(1)}</ol>
        <p data-error-for="members" hidden></p>
        <button type="button" data-member-add><span data-member-add-label></span></button>
        <template data-member-template>${row('__KEY__')}</template>
        <label for="reg-terms">Aceite</label>
        <input id="reg-terms" type="checkbox" data-field="acceptedTerms" />
        <p id="reg-terms-error" hidden></p>
        <div data-reg-failure hidden><p data-reg-failure-text></p><button type="button" data-reg-retry></button></div>
        <button type="submit" data-reg-submit><span class="btn__label">Confirmar inscrição</span></button>
      </form>
      <div data-reg-success hidden><h3 tabindex="-1" data-reg-success-title></h3></div>
      <p data-reg-live></p>
    </div>
  </div>`;

function mount(before?: (root: HTMLElement) => void) {
  document.body.innerHTML = MARKUP;
  const { vm } = setupForm();
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  before?.(root);
  const served = Array.from(root.querySelectorAll<HTMLElement>('[data-members-list] > li'));
  const scroll = vi.fn();
  new RegistrationFormView(root, vm, new EventBus<AppEvents>(), scroll).mount();
  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('[data-members-list] [data-member-row]'));
  const input = (i: number, name: string) =>
    rows()[i]?.querySelector<HTMLInputElement>(`[data-member-field="${name}"]`) ?? null;
  return { vm, root, served, rows, input, scroll };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('RegistrationFormView · cards de integrante vindos do HTML', () => {
  it('adota os cards do servidor (mesmos elementos, sem duplicar) e clona só os extras', () => {
    const { vm, served, rows } = mount();
    expect(rows()).toEqual(served);
    vm.addMember();
    expect(rows()).toHaveLength(3);
    expect(rows()[2]?.dataset['memberKey']).toBe('2');
    expect(rows()[2]?.querySelector('input')?.id).toBe('member-2-name');
  });

  it('o que foi digitado nos cards antes do JS vai pro VM', () => {
    const { vm } = mount((root) => {
      const typed = root.querySelector<HTMLInputElement>('#member-1-email');
      if (typed) typed.value = 'bruno@exemplo.com';
    });
    expect(vm.fields.members[1]?.email).toBe('bruno@exemplo.com');
    expect(vm.fields.members[0]?.email).toBe('');
  });

  it('só o contato aceita o preenchimento automático de nome e e-mail (WCAG 1.3.5)', () => {
    const { vm, input } = mount();
    vm.addMember();
    expect([input(0, 'name')?.autocomplete, input(0, 'email')?.autocomplete]).toEqual(['name', 'email']);
    expect([input(1, 'name')?.autocomplete, input(1, 'email')?.autocomplete]).toEqual(['off', 'off']);
    expect(input(2, 'name')?.autocomplete).toBe('off');
    expect(input(0, 'studentId')?.autocomplete).toBe('off');
  });

  it('envio com vários erros: o foco vai pro resumo, que rola pra baixo do header', async () => {
    const { vm, root, scroll } = mount();
    await vm.submit();
    const summary = root.querySelector<HTMLElement>('[data-error-summary]');
    expect(summary?.hidden).toBe(false);
    expect(document.activeElement).toBe(summary);
    expect(scroll).toHaveBeenCalledWith(summary);
    // o resumo se anuncia pelo título: sem aviso repetido no live region
    expect(root.querySelector('[data-reg-live]')?.textContent).toBe('');
  });
});
