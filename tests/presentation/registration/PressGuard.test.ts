// digitou e foi direto no botão: a validação do blur (que empurra o botão pra baixo) espera o clique acontecer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { PressGuard } from '@presentation/views/registration/PressGuard';
import { formMarkup } from './formMarkup';
import { setupForm } from './formSetup';

let form: HTMLElement;
let guard: PressGuard;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML =
    '<form><input id="name" /><button type="submit"><span>Enviar</span></button></form>';
  form = document.querySelector('form') as HTMLElement;
  guard = new PressGuard(form);
});

afterEach(() => {
  vi.useRealTimers();
});

const press = (target: Element) => target.dispatchEvent(new Event('pointerdown', { bubbles: true }));

describe('PressGuard', () => {
  it('sem botão apertado, roda na hora', () => {
    const fn = vi.fn();
    guard.run(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('com o botão apertado, espera o clique e roda logo depois dos handlers dele', () => {
    const order: string[] = [];
    form.addEventListener('click', () => order.push('click'));
    press(form.querySelector('span') as Element);
    guard.run(() => order.push('blur'));
    expect(order).toEqual([]);
    form.querySelector('button')?.click();
    expect(order).toEqual(['click']);
    vi.runAllTimers();
    expect(order).toEqual(['click', 'blur']);
  });

  it('apertou e arrastou pra fora (sem clique): roda mesmo assim, depois de um tempo', () => {
    const fn = vi.fn();
    press(form.querySelector('button') as Element);
    guard.run(fn);
    vi.advanceTimersByTime(1100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('apertar fora de um botão não segura nada', () => {
    const fn = vi.fn();
    press(form.querySelector('input') as Element);
    guard.run(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// com o markup de verdade (o "Remover" vem antes dos campos no card): a validação segurada pelo PressGuard
// acha a linha na hora de rodar, não na hora do blur, então "Remover" não marca a linha errada
describe('PressGuard + Remover do integrante', () => {
  const press = (target: Element) => target.dispatchEvent(new Event('pointerdown', { bubbles: true }));

  function mountForm() {
    document.body.innerHTML = formMarkup();
    const { vm } = setupForm();
    const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
    new RegistrationFormView(root, vm, new EventBus<AppEvents>(), vi.fn()).mount();
    const rows = () => Array.from(root.querySelectorAll<HTMLElement>('[data-member-row]'));
    return { vm, rows };
  }

  it('digitou no integrante 3 e tocou no "Remover" dele: o card novo que entra depois vem limpo', () => {
    const { vm, rows } = mountForm();
    vm.addMember();
    const third = rows()[2] as HTMLElement;
    const name = third.querySelector<HTMLInputElement>('[data-member-field="name"]') as HTMLInputElement;
    name.value = 'Ca';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const remove = third.querySelector<HTMLButtonElement>('[data-member-remove]') as HTMLButtonElement;
    press(remove);
    name.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    remove.click();
    vi.runAllTimers();
    expect(rows()).toHaveLength(2);
    vm.addMember();
    expect(vm.state.value.errors).toEqual({});
  });

  it('removeu outro card: o blur segurado vale pra linha que subiu', () => {
    const { vm, rows } = mountForm();
    vm.addMember();
    vm.addMember();
    const fourth = rows()[3] as HTMLElement;
    const name = fourth.querySelector<HTMLInputElement>('[data-member-field="name"]') as HTMLInputElement;
    const remove = (rows()[2] as HTMLElement).querySelector('[data-member-remove]') as HTMLButtonElement;
    press(remove);
    name.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    remove.click();
    vi.runAllTimers();
    // o integrante 4 virou o 3: é ele que fica "visitado" (nome vazio acusa)
    expect(Object.keys(vm.state.value.errors)).toEqual(['members.2.name']);
  });
});
