import { describe, expect, it } from 'vitest';
import { MIN_FILL_MS, RegistrationGatewayError } from '@application/index';
import { TEAM_SIZE } from '../helpers/fixtures';
import { fillValidTeam, setupForm as setup } from './registration/formSetup';

describe('RegistrationFormViewModel · integrantes', () => {
  it('começa com o mínimo de linhas (o líder conta como 1)', () => {
    const { vm } = setup();
    expect(vm.fields.members).toHaveLength(1);
    expect(vm.state.value).toMatchObject({ canAddMember: true, canRemoveMember: false });
  });

  it('adiciona até o máximo e para', () => {
    const { vm } = setup();
    for (let i = 0; i < 10; i++) vm.addMember();
    expect(vm.fields.members).toHaveLength(TEAM_SIZE.max - 1);
    expect(vm.state.value.canAddMember).toBe(false);
    expect(vm.state.value.focus?.path).toBe('members.3.name');
  });

  it('remove sem passar do mínimo e mantém as chaves estáveis', () => {
    const { vm } = setup();
    vm.addMember();
    vm.addMember();
    const keys = vm.fields.members.map((m) => m.key);
    vm.removeMember(1);
    expect(vm.fields.members.map((m) => m.key)).toEqual([keys[0], keys[2]]);
    vm.removeMember(0);
    vm.removeMember(0);
    expect(vm.fields.members).toHaveLength(1);
  });

  it('modo solo não deixa mexer nos integrantes', () => {
    const { vm } = setup();
    vm.setMode('solo');
    expect(vm.state.value).toMatchObject({ canAddMember: false, canRemoveMember: false });
  });
});

describe('RegistrationFormViewModel · validação', () => {
  it('só mostra o erro depois do blur', () => {
    const { vm } = setup();
    vm.setText('leader.email', 'ana@');
    expect(vm.state.value.errors['leader.email']).toBeUndefined();
    vm.blur('leader.email');
    expect(vm.state.value.errors['leader.email']).toBe('E-mail inválido.');
    vm.setText('leader.email', 'ana@exemplo.com');
    expect(vm.state.value.errors['leader.email']).toBeUndefined();
  });

  it('no envio mostra tudo e pede foco no primeiro campo inválido', async () => {
    const { vm, gateway } = setup();
    await vm.submit();
    const { errors, focus, attempted, orderedErrors } = vm.state.value;
    expect(attempted).toBe(true);
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['teamName', 'leader.name', 'acceptedTerms']));
    expect(focus).toMatchObject({ path: 'teamName', reason: 'invalid' });
    expect(orderedErrors[0]?.path).toBe('teamName');
    expect(gateway.calls).toHaveLength(0);
  });

  it('depois de tentar enviar, revalida ao vivo', async () => {
    const { vm } = setup();
    await vm.submit();
    vm.setText('teamName', 'Bug Busters');
    expect(vm.state.value.errors['teamName']).toBeUndefined();
  });

  it('erro de integrante aponta pra linha real mesmo com linha vazia antes', async () => {
    const { vm } = setup();
    fillValidTeam(vm);
    vm.addMember();
    vm.setText('members.0.name', '');
    vm.setText('members.0.email', '');
    vm.setText('members.1.name', 'Carla Dias');
    vm.setText('members.1.email', 'carla@');
    await vm.submit();
    expect(vm.state.value.errors['members.1.email']).toBe('E-mail inválido.');
    expect(vm.state.value.errors['members.0.email']).toBeUndefined();
  });

  it('modo solo não cobra nome da equipe', async () => {
    const { vm } = setup();
    vm.setMode('solo');
    await vm.submit();
    expect(vm.state.value.errors['teamName']).toBeUndefined();
    expect(vm.state.value.focus?.path).toBe('leader.name');
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

  it('erro do servidor é passageiro: mensagem própria, com "Tentar de novo"', async () => {
    const { vm, gateway } = setup();
    fillValidTeam(vm);
    gateway.willThrow(new RegistrationGatewayError('server', 'x'));
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'error', retryable: true });
    expect(vm.state.value.failure).not.toMatch(/recusad/i);
  });

  it('e-mail repetido não oferece "Tentar de novo" (o caminho é corrigir)', async () => {
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
