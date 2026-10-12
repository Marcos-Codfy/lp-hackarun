// cards do mínimo da equipe já vêm no HTML (prévia "em breve" e antes do chunk da inscrição chegar):
// a View adota esses cards em vez de clonar outros, e o que já foi digitado neles vai pro VM
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { formMarkup } from './formMarkup';
import { setupForm } from './formSetup';

const MARKUP = formMarkup();

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
