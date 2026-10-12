// resumo de erros por bloco: o envio vazio vira 4 linhas curtas (equipe, cada integrante, aceite) em vez de 9
// frases repetidas; bloco com um erro só mantém a frase exata (o e-mail já inscrito, por exemplo)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegistrationGatewayError } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { groupErrors, joinParts } from '@presentation/views/registration/errorGroups';
import { formMarkup } from './formMarkup';
import { fillValidTeam, setupForm } from './formSetup';

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

describe('groupErrors', () => {
  it('junta por bloco na ordem do formulário e guarda o nome curto de cada campo', () => {
    const groups = groupErrors([
      { path: 'teamName', message: 'a' },
      { path: 'teamImage', message: 'b' },
      { path: 'members.1.studentId', message: 'c' },
      { path: 'members.1.email', message: 'd' },
      { path: 'acceptedTerms', message: 'e' },
    ]);
    expect(groups.map((g) => [g.title, g.parts])).toEqual([
      ['Equipe', ['nome', 'foto ou logo']],
      ['Integrante 2', ['matrícula', 'e-mail']],
      [null, ['acceptedTerms']],
    ]);
  });

  it('lista em português: "a, b e c"', () => {
    expect(joinParts(['nome'])).toBe('nome');
    expect(joinParts(['nome', 'e-mail'])).toBe('nome e e-mail');
    expect(joinParts(['nome', 'matrícula', 'e-mail'])).toBe('nome, matrícula e e-mail');
  });
});

describe('resumo de erros na tela', () => {
  it('envio vazio: 4 linhas, cada uma levando pro 1º campo do bloco', async () => {
    const { vm, items, title } = mount();
    await vm.submit();
    expect(title()).toBe('Faltam ajustar 9 campos:');
    expect(items()).toEqual([
      { text: 'Equipe: nome e foto ou logo', path: 'teamName' },
      { text: 'Integrante 1: nome, matrícula e e-mail', path: 'members.0.name' },
      { text: 'Integrante 2: nome, matrícula e e-mail', path: 'members.1.name' },
      {
        text: 'Regulamento e LGPD: É preciso concordar com o regulamento e o uso dos dados.',
        path: 'acceptedTerms',
      },
    ]);
  });

  it('erro do servidor num campo só: a frase exata continua no resumo', async () => {
    const { vm, gateway, items } = mount();
    fillValidTeam(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate-email', 'x', [1]));
    await vm.submit();
    expect(items()).toEqual([
      {
        text: 'Integrante 2 · E-mail: Esse e-mail já está em outra equipe inscrita.',
        path: 'members.1.email',
      },
    ]);
  });
});
