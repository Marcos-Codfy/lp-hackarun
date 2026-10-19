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

// com o markup de verdade: digitou o e-mail torto e foi direto no "Confirmar": a validação do blur espera o
// clique, então o envio acontece (e mostra o resumo) em vez de o botão "fugir" do dedo
describe('PressGuard + Confirmar inscrição', () => {
  it('blur segurado pelo botão roda depois do clique', async () => {
    document.body.innerHTML = formMarkup();
    const { vm } = setupForm();
    const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
    new RegistrationFormView(root, vm, new EventBus<AppEvents>(), vi.fn()).mount();
    const email = root.querySelector<HTMLInputElement>('#reg-email') as HTMLInputElement;
    email.value = 'ana@';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const submit = root.querySelector<HTMLButtonElement>('[data-reg-submit]') as HTMLButtonElement;
    press(submit);
    email.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(vm.state.value.errors['email']).toBeUndefined();
    // clique no botão (o PressGuard escuta) e o envio do formulário, como o navegador faz
    submit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    vi.runAllTimers();
    await Promise.resolve();
    expect(vm.state.value.attempted).toBe(true);
    expect(vm.state.value.errors['email']).toBe('Confira o e-mail: algo como nome@exemplo.com.');
  });
});
