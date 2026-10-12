import { describe, expect, it } from 'vitest';
import { MIN_FILL_MS, RegistrationGatewayError } from '@application/index';
import { TEAM_SIZE } from '../helpers/fixtures';
import { fillMember, fillValidTeam, setupForm as setup } from './registration/formSetup';

describe('RegistrationFormViewModel · integrantes', () => {
  it('começa com o mínimo de cards (o contato conta como integrante 1)', () => {
    const { vm } = setup();
    expect(vm.fields.members).toHaveLength(TEAM_SIZE.min);
    expect(vm.state.value).toMatchObject({ canAddMember: true, canRemoveMember: false });
  });

  it('adiciona até o máximo, leva o foco pro card novo e avisa o leitor de tela', () => {
    const { vm } = setup();
    vm.addMember();
    expect(vm.state.value.focus).toMatchObject({ path: 'members.2.name', reason: 'move' });
    expect(vm.state.value.announcement?.text).toBe(
      'Integrante 3 adicionado. A equipe tem 3 de 5 integrantes.',
    );
    for (let i = 0; i < 10; i++) vm.addMember();
    expect(vm.fields.members).toHaveLength(TEAM_SIZE.max);
    expect(vm.state.value.canAddMember).toBe(false);
    expect(vm.state.value.announcement?.text).toBe('Integrante 5 adicionado. Equipe completa: 5 de 5.');
  });

  it('remove sem passar do mínimo, mantém as chaves estáveis e nunca tira o contato', () => {
    const { vm } = setup();
    vm.addMember();
    vm.addMember();
    const keys = vm.fields.members.map((m) => m.key);
    vm.removeMember(0);
    expect(vm.fields.members).toHaveLength(4);
    vm.removeMember(2);
    expect(vm.fields.members.map((m) => m.key)).toEqual([keys[0], keys[1], keys[3]]);
    expect(vm.state.value.announcement?.text).toBe('Integrante 3 removido. A equipe tem 3 de 5 integrantes.');
    vm.removeMember(1);
    vm.removeMember(1);
    expect(vm.fields.members).toHaveLength(TEAM_SIZE.min);
    expect(vm.state.value.canRemoveMember).toBe(false);
  });

  it('o foco vai pro card que subiu ou, se era o último, pro "Adicionar integrante"', () => {
    const { vm } = setup();
    vm.addMember();
    vm.addMember();
    vm.removeMember(2);
    expect(vm.state.value.focus?.path).toBe('members.2.name');
    vm.removeMember(2);
    expect(vm.state.value.focus?.path).toBe('members.add');
  });

  it('remover um card leva junto o que foi digitado nele e os erros acompanham a linha certa', async () => {
    const { vm } = setup();
    fillValidTeam(vm);
    vm.addMember();
    fillMember(vm, 2, { name: 'Carla Dias', studentId: '12', email: 'carla@exemplo.com' });
    vm.addMember();
    fillMember(vm, 3);
    await vm.submit();
    expect(vm.state.value.errors['members.2.studentId']).toBeDefined();
    vm.removeMember(2);
    expect(vm.fields.members[2]?.name).toBe('Davi Rocha');
    expect(vm.state.value.errors['members.2.studentId']).toBeUndefined();
  });
});

describe('RegistrationFormViewModel · validação', () => {
  it('só mostra o erro depois do blur', () => {
    const { vm } = setup();
    vm.setText('members.0.email', 'ana@');
    expect(vm.state.value.errors['members.0.email']).toBeUndefined();
    vm.blur('members.0.email');
    expect(vm.state.value.errors['members.0.email']).toBe('Confira o e-mail: algo como nome@exemplo.com.');
    vm.setText('members.0.email', 'ana@exemplo.com');
    expect(vm.state.value.errors['members.0.email']).toBeUndefined();
  });

  it('no envio mostra tudo, na ordem do formulário, e pede foco no primeiro campo inválido', async () => {
    const { vm, gateway } = setup();
    await vm.submit();
    const { errors, focus, attempted, orderedErrors } = vm.state.value;
    expect(attempted).toBe(true);
    expect(orderedErrors.map((e) => e.path)).toEqual([
      'teamName',
      'teamImage',
      'members.0.name',
      'members.0.studentId',
      'members.0.email',
      'members.1.name',
      'members.1.studentId',
      'members.1.email',
      'acceptedTerms',
    ]);
    expect(errors['members.1.studentId']).toBe('Informe a matrícula.');
    expect(focus).toMatchObject({ path: 'teamName', reason: 'invalid' });
    expect(gateway.calls).toHaveLength(0);
  });

  it('nome sem sobrenome, matrícula torta e e-mail repetido têm mensagens próprias', async () => {
    const { vm } = setup();
    fillValidTeam(vm);
    vm.setText('members.0.name', 'Ana');
    vm.setText('members.1.studentId', '20 24');
    vm.setText('members.1.email', 'ANA@exemplo.com');
    await vm.submit();
    expect(vm.state.value.errors).toEqual({
      'members.0.name': 'Escreva nome e sobrenome.',
      'members.1.studentId': 'Use só letras, números, ponto, hífen ou barra.',
      'members.1.email': 'Esse e-mail já está no integrante 1.',
    });
  });

  it('depois de tentar enviar, revalida ao vivo', async () => {
    const { vm } = setup();
    await vm.submit();
    vm.setText('teamName', 'Bug Busters');
    expect(vm.state.value.errors['teamName']).toBeUndefined();
  });
});

describe('RegistrationFormViewModel · envio', () => {
  it('sucesso guarda o protocolo e manda os metadados anti-spam', async () => {
    const { vm, gateway, clock } = setup();
    vm.setSource('hero');
    fillValidTeam(vm);
    clock.advance(42_000);
    gateway.willReturn('HR26-XY34ZW');
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'success', protocol: 'HR26-XY34ZW' });
    expect(gateway.calls[0]).toMatchObject({ honeypot: '', elapsedMs: 42_000, source: 'hero' });
    expect(gateway.calls[0]?.members).toHaveLength(2);
  });

  it('falha mostra a mensagem e o retry tenta de novo', async () => {
    const { vm, gateway } = setup();
    fillValidTeam(vm);
    gateway.willThrow(new RegistrationGatewayError('network', 'offline')).willReturn('HR26-RETRY2');
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'error', retryable: true });
    expect(vm.state.value.failure).toContain('conexão');
    await vm.retry();
    expect(vm.state.value).toMatchObject({ status: 'success', protocol: 'HR26-RETRY2', failure: null });
  });

  it('o "Tentar de novo" manda a mesma chave; depois do sucesso a chave troca', async () => {
    const { vm, gateway, newKey } = setup();
    fillValidTeam(vm);
    gateway
      .willThrow(new RegistrationGatewayError('server', 'x'))
      .willThrow(new RegistrationGatewayError('network', 'x'));
    await vm.submit();
    await vm.retry();
    await vm.retry();
    expect(gateway.calls.map((c) => c.idempotencyKey)).toEqual(['chave-0001', 'chave-0001', 'chave-0001']);
    expect(vm.state.value.status).toBe('success');
    expect(newKey).toHaveBeenCalledTimes(2);
  });

  it('inscrição repetida não oferece "Tentar de novo" (o caminho é corrigir)', async () => {
    const { vm, gateway } = setup();
    fillValidTeam(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate', 'x'));
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'error', retryable: false });
  });

  it('honeypot preenchido vai junto pro servidor decidir', async () => {
    const { vm, gateway } = setup();
    fillValidTeam(vm);
    vm.setText('honeypot', 'http://spam.example');
    await vm.submit();
    expect(gateway.calls[0]?.honeypot).toBe('http://spam.example');
  });

  it('tempo do anti-robô conta desde que o formulário montou, não do primeiro toque', async () => {
    const { vm, gateway, clock, sleep } = setup();
    clock.advance(5_000);
    fillValidTeam(vm);
    await vm.submit();
    expect(gateway.calls[0]?.elapsedMs).toBe(5_000);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('autofill + enviar na hora: espera o mínimo e envia, em vez de ser barrado', async () => {
    const { vm, gateway, clock, sleep } = setup();
    fillValidTeam(vm);
    clock.advance(800);
    await vm.submit();
    expect(sleep).toHaveBeenCalledWith(MIN_FILL_MS - 800);
    expect(gateway.calls[0]?.elapsedMs).toBe(MIN_FILL_MS);
    expect(vm.state.value.status).toBe('success');
  });

  it('inscrição fechada não envia nada', async () => {
    const { vm, gateway } = setup({ isOpen: false });
    fillValidTeam(vm);
    await vm.submit();
    expect(gateway.calls).toHaveLength(0);
    expect(vm.state.value.status).toBe('idle');
  });
});
