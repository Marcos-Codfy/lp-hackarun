import { describe, expect, it } from 'vitest';
import { MIN_FILL_MS, RegistrationGatewayError } from '@application/index';
import { fillValid, setupForm as setup } from './registration/formSetup';

describe('RegistrationFormViewModel · validação', () => {
  it('só mostra o erro de texto depois do blur', () => {
    const { vm } = setup();
    vm.setValue('email', 'ana@');
    expect(vm.state.value.errors['email']).toBeUndefined();
    vm.blur('email');
    expect(vm.state.value.errors['email']).toBe('Confira o e-mail: algo como nome@exemplo.com.');
    vm.setValue('email', 'ana@exemplo.com');
    expect(vm.state.value.errors['email']).toBeUndefined();
  });

  it('no envio mostra tudo, na ordem do formulário, e pede foco no primeiro campo inválido', async () => {
    const { vm, gateway } = setup();
    await vm.submit();
    const { focus, attempted, orderedErrors } = vm.state.value;
    expect(attempted).toBe(true);
    expect(orderedErrors.map((e) => e.path)).toEqual([
      'name',
      'email',
      'whatsapp',
      'adult',
      'profile',
      'acceptedTerms',
    ]);
    expect(focus).toMatchObject({ path: 'name', reason: 'invalid' });
    expect(gateway.calls).toHaveLength(0);
  });

  it('o perfil decide quais campos são cobrados', async () => {
    const { vm } = setup();
    fillValid(vm, { name: 'Ana Souza', email: 'ana@exemplo.com', whatsapp: '63999991234', adult: 'yes' });
    vm.setValue('profile', 'other-institution');
    await vm.submit();
    expect(Object.keys(vm.state.value.errors).sort()).toEqual(['course', 'period']);
    vm.setValue('profile', 'self-taught');
    expect(Object.keys(vm.state.value.errors)).toEqual(['area']);
    vm.setValue('area', 'security');
    expect(vm.state.value.errors).toEqual({});
  });

  it('campo escondido pelo perfil não acusa erro, mesmo com valor torto', async () => {
    const { vm } = setup();
    fillValid(vm);
    vm.setValue('studentId', '?? ??');
    vm.setValue('profile', 'graduate');
    vm.setValue('area', 'design');
    await vm.submit();
    expect(vm.state.value.status).toBe('success');
  });

  it('escolher uma opção já valida (sem esperar o blur); opção fora da lista vira vazio', () => {
    const { vm } = setup();
    vm.setValue('profile', 'hacker');
    expect(vm.fields.profile).toBe('');
    expect(vm.state.value.errors['profile']).toBe('Escolha a opção que mais combina com você.');
    vm.setValue('profile', 'graduate');
    expect(vm.state.value.errors['profile']).toBeUndefined();
  });

  it('depois de tentar enviar, revalida ao vivo', async () => {
    const { vm } = setup();
    await vm.submit();
    vm.setValue('name', 'Ana Souza');
    expect(vm.state.value.errors['name']).toBeUndefined();
  });

  it('reset volta ao começo, com o foco no nome', () => {
    const { vm } = setup();
    fillValid(vm);
    expect(vm.reset()).toBe(true);
    expect(vm.fields.name).toBe('');
    expect(vm.state.value.focus?.path).toBe('name');
  });
});

describe('RegistrationFormViewModel · envio', () => {
  it('sucesso guarda o protocolo e manda os metadados anti-spam', async () => {
    const { vm, gateway, clock } = setup();
    vm.setSource('hero');
    fillValid(vm);
    clock.advance(42_000);
    gateway.willReturn('HR26-XY34ZW');
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'success', protocol: 'HR26-XY34ZW' });
    expect(gateway.calls[0]).toMatchObject({ honeypot: '', elapsedMs: 42_000, source: 'hero' });
    expect(gateway.calls[0]?.participant.email).toBe('ana@exemplo.com');
  });

  it('falha mostra a mensagem e o retry tenta de novo', async () => {
    const { vm, gateway } = setup();
    fillValid(vm);
    gateway.willThrow(new RegistrationGatewayError('network', 'offline')).willReturn('HR26-RETRY2');
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'error', retryable: true });
    expect(vm.state.value.failure).toContain('conexão');
    await vm.retry();
    expect(vm.state.value).toMatchObject({ status: 'success', protocol: 'HR26-RETRY2', failure: null });
  });

  it('o "Tentar de novo" manda a mesma chave; depois do sucesso a chave troca', async () => {
    const { vm, gateway, newKey } = setup();
    fillValid(vm);
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
    fillValid(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate', 'x'));
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'error', retryable: false });
  });

  it('honeypot preenchido vai junto pro servidor decidir', async () => {
    const { vm, gateway } = setup();
    fillValid(vm);
    vm.setValue('honeypot', 'http://spam.example');
    await vm.submit();
    expect(gateway.calls[0]?.honeypot).toBe('http://spam.example');
  });

  it('tempo do anti-robô conta desde que o formulário montou, não do primeiro toque', async () => {
    const { vm, gateway, clock, sleep } = setup();
    clock.advance(5_000);
    fillValid(vm);
    await vm.submit();
    expect(gateway.calls[0]?.elapsedMs).toBe(5_000);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('autofill + enviar na hora: espera o mínimo e envia, em vez de ser barrado', async () => {
    const { vm, gateway, clock, sleep } = setup();
    fillValid(vm);
    clock.advance(800);
    await vm.submit();
    expect(sleep).toHaveBeenCalledWith(MIN_FILL_MS - 800);
    expect(gateway.calls[0]?.elapsedMs).toBe(MIN_FILL_MS);
    expect(vm.state.value.status).toBe('success');
  });

  it('menor de idade: o sucesso marca o lembrete da autorização do responsável', async () => {
    const { vm } = setup();
    fillValid(vm);
    vm.setValue('adult', 'no');
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'success', needsGuardianConsent: true });
  });

  it('e-mail já inscrito vira erro no campo e some quando a pessoa troca o valor', async () => {
    const { vm, gateway } = setup();
    fillValid(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate-email', 'x'));
    await vm.submit();
    expect(vm.state.value.errors).toEqual({ email: 'Esse e-mail já tem uma inscrição.' });
    expect(vm.state.value.focus).toMatchObject({ path: 'email', reason: 'invalid' });
    vm.setValue('email', 'outra@exemplo.com');
    expect(vm.state.value.errors['email']).toBeUndefined();
    vm.setValue('email', ' ANA@exemplo.com');
    expect(vm.state.value.errors['email']).toBe('Esse e-mail já tem uma inscrição.');
  });

  it('WhatsApp já inscrito volta a acusar mesmo escrito de outro jeito', async () => {
    const { vm, gateway } = setup();
    fillValid(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate-whatsapp', 'x'));
    await vm.submit();
    vm.setValue('whatsapp', '+55 63 99999-1234');
    expect(vm.state.value.errors['whatsapp']).toBe('Esse WhatsApp já tem uma inscrição.');
  });

  it('inscrição fechada não envia nada', async () => {
    const { vm, gateway } = setup({ isOpen: false });
    fillValid(vm);
    await vm.submit();
    expect(gateway.calls).toHaveLength(0);
    expect(vm.state.value.status).toBe('idle');
  });
});
