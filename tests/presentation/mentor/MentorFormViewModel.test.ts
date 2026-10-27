import { describe, expect, it } from 'vitest';
import { MIN_FILL_MS, RegistrationGatewayError } from '@application/index';
import { fillValidMentor, setupMentorForm as setup, VALID_TEXT } from './mentorSetup';

describe('MentorFormViewModel · validação', () => {
  it('só mostra o erro de texto depois do blur', () => {
    const { vm } = setup();
    vm.setValue('email', 'ana@');
    expect(vm.state.value.errors['email']).toBeUndefined();
    vm.blur('email');
    expect(vm.state.value.errors['email']).toBeDefined();
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
      'area',
      'role',
      'experience',
      'graduate',
      'days',
      'format',
      'mode',
      'acceptedTerms',
    ]);
    expect(focus).toMatchObject({ path: 'name', reason: 'invalid' });
    expect(gateway.calls).toHaveLength(0);
  });

  it('curso e ano de formatura só são cobrados de quem é egresso', async () => {
    const { vm } = setup();
    fillValidMentor(vm, {
      name: 'Ana Souza',
      email: 'ana@exemplo.com',
      whatsapp: '(63) 99999-0101',
      area: 'security',
      role: 'Analista de segurança',
      company: 'Empresa Exemplo',
      experience: '5-to-10',
      format: 'online',
      mode: 'either',
      graduate: 'yes',
    });
    await vm.submit();
    expect(Object.keys(vm.state.value.errors).sort()).toEqual(['course', 'graduationYear']);
    vm.setValue('graduate', 'no');
    expect(Object.keys(vm.state.value.errors)).toEqual([]);
  });

  it('campo escondido por não ser egresso não acusa erro, mesmo com valor torto', async () => {
    const { vm } = setup();
    fillValidMentor(vm);
    vm.setValue('graduationYear', '1800');
    vm.setValue('graduate', 'no');
    await vm.submit();
    expect(vm.state.value.status).toBe('success');
  });

  it('escolher uma opção já valida; opção fora da lista vira vazio', () => {
    const { vm } = setup();
    vm.setValue('area', 'hacker');
    expect(vm.fields.area).toBe('');
    expect(vm.state.value.errors['area']).toBeDefined();
    vm.setValue('area', 'security');
    expect(vm.state.value.errors['area']).toBeUndefined();
  });

  it('os dias ficam na ordem do evento, sem repetir e sem dia inventado', () => {
    const { vm } = setup();
    vm.setDays(['14', '12', '12', '31']);
    expect(vm.fields.days).toEqual(['12', '14']);
    vm.setDays([]);
    expect(vm.state.value.errors['days']).toBeDefined();
  });

  it('a empresa é opcional (autônomo ou entre empregos)', async () => {
    const { vm, gateway } = setup();
    fillValidMentor(vm, { ...VALID_TEXT, company: '' });
    await vm.submit();
    expect(vm.state.value.status).toBe('success');
    expect(gateway.calls[0]?.mentor.company).toBe('');
  });

  it('o aceite é obrigatório; a divulgação do nome é opcional', async () => {
    const { vm, gateway } = setup();
    fillValidMentor(vm);
    vm.setFlag('acceptedTerms', false);
    await vm.submit();
    expect(Object.keys(vm.state.value.errors)).toEqual(['acceptedTerms']);
    expect(gateway.calls).toHaveLength(0);
    vm.setFlag('acceptedTerms', true);
    await vm.submit();
    expect(vm.state.value.status).toBe('success');
    expect(gateway.calls[0]?.mentor.mayPublish).toBe(false);
  });
});

describe('MentorFormViewModel · envio', () => {
  it('manda o cadastro limpo com a origem, o consentimento e a chave, e mostra o protocolo', async () => {
    const { vm, gateway } = setup();
    vm.setSource('crew');
    fillValidMentor(vm);
    vm.setValue('linkedin', 'linkedin.com/in/ana-souza');
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'success', protocol: 'MT26-TESTE1' });
    expect(gateway.calls).toHaveLength(1);
    expect(gateway.calls[0]).toMatchObject({
      source: 'crew',
      consentVersion: '2026-10-m1',
      idempotencyKey: 'chave-0001',
      honeypot: '',
      mentor: {
        email: 'ana.mentora@exemplo.com',
        linkedin: 'https://linkedin.com/in/ana-souza',
        days: ['13', '14'],
        graduate: true,
        graduationYear: 2019,
      },
    });
    expect(gateway.calls[0]?.elapsedMs).toBeGreaterThanOrEqual(MIN_FILL_MS);
  });

  it('não envia duas vezes enquanto uma chamada está em andamento nem depois do sucesso', async () => {
    const { vm, gateway } = setup();
    fillValidMentor(vm);
    await Promise.all([vm.submit(), vm.submit()]);
    await vm.submit();
    expect(gateway.calls).toHaveLength(1);
  });

  it('falha de rede deixa tentar de novo com a mesma chave (o servidor não duplica)', async () => {
    const { vm, gateway } = setup();
    gateway.willThrow(new RegistrationGatewayError('network', 'offline'));
    fillValidMentor(vm);
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'error', retryable: true });
    expect(vm.state.value.failure).toBeTruthy();
    await vm.retry();
    expect(vm.state.value.status).toBe('success');
    expect(gateway.calls.map((c) => c.idempotencyKey)).toEqual(['chave-0001', 'chave-0001']);
  });

  it('e-mail ou WhatsApp que o servidor já tem viram erro no campo até a pessoa trocar o valor', async () => {
    const { vm, gateway } = setup();
    gateway.willThrow(new RegistrationGatewayError('duplicate-email', 'ja existe'));
    fillValidMentor(vm);
    await vm.submit();
    const { status, errors, focus } = vm.state.value;
    expect(status).toBe('idle');
    expect(Object.keys(errors)).toEqual(['email']);
    expect(focus).toMatchObject({ path: 'email', reason: 'invalid' });
    // mexer em outro campo não apaga o erro; trocar o e-mail, sim
    vm.setValue('role', 'Pessoa engenheira de segurança');
    expect(vm.state.value.errors['email']).toBeDefined();
    vm.setValue('email', 'outra.pessoa@exemplo.com');
    expect(vm.state.value.errors['email']).toBeUndefined();
  });

  it('cadastro encerrado pelo servidor fecha o formulário em vez de pedir nova tentativa', async () => {
    const { vm, gateway } = setup();
    gateway.willThrow(new RegistrationGatewayError('closed', 'encerrado'));
    fillValidMentor(vm);
    await vm.submit();
    expect(vm.state.value.open).toBe(false);
    expect(vm.isOpen).toBe(false);
    await vm.submit();
    expect(gateway.calls).toHaveLength(1);
  });

  it('build fechado: nasce fechado e não envia', async () => {
    const { vm, gateway } = setup({ isOpen: false });
    fillValidMentor(vm);
    await vm.submit();
    expect(vm.isOpen).toBe(false);
    expect(gateway.calls).toHaveLength(0);
  });

  it('honeypot preenchido segue no payload (quem decide é o servidor)', async () => {
    const { vm, gateway } = setup();
    fillValidMentor(vm);
    vm.setValue('honeypot', 'http://spam.example');
    await vm.submit();
    expect(gateway.calls[0]?.honeypot).toBe('http://spam.example');
  });
});
