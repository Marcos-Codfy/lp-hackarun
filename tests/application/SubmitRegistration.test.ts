import { describe, expect, it, vi } from 'vitest';
import {
  CONSENT_VERSION,
  MIN_FILL_MS,
  RegistrationGatewayError,
  SubmitRegistration,
  type RegistrationWindowSnapshot,
  type SubmitRegistrationDeps,
} from '@application/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { FakeGateway, TEAM_SIZE, participantInput } from '../helpers/fixtures';

const NOW = new Date('2026-11-01T12:00:00Z');
const META = { honeypot: '', elapsedMs: 8000 };

const windowWith = (patch: Partial<RegistrationWindowSnapshot> = {}): RegistrationWindowSnapshot => ({
  endpoint: 'https://script.google.com/macros/s/abc/exec',
  closesAt: '2026-11-08T23:59:00-03:00',
  slots: { capacity: null, taken: 0, remaining: null, level: 'unknown' },
  ...patch,
});

function setup(deps: Partial<SubmitRegistrationDeps> = {}) {
  const gateway = new FakeGateway();
  const sleep = vi.fn((_ms: number) => Promise.resolve());
  const useCase = new SubmitRegistration({
    gateway,
    clock: new FixedClock(NOW),
    teamSize: TEAM_SIZE,
    sleep,
    ...deps,
  });
  return { gateway, useCase, sleep };
}

describe('SubmitRegistration', () => {
  it('dados inválidos nem chegam no gateway', async () => {
    const { gateway, useCase } = setup();
    const result = await useCase.execute(participantInput({ acceptedTerms: false }));
    expect(result.status).toBe('invalid');
    expect(result.status === 'invalid' && result.errors['acceptedTerms']).toBeTruthy();
    expect(gateway.calls).toHaveLength(0);
  });

  it('validate devolve {} quando está tudo certo', () => {
    expect(setup().useCase.validate(participantInput())).toEqual({});
  });

  it('envia o payload normalizado com os metadados anti-spam e a chave do envio', async () => {
    const { gateway, useCase, sleep } = setup();
    gateway.willReturn('HR26-ABC234');
    const input = participantInput({
      name: '  Ana   Souza ',
      email: 'Ana@Exemplo.com',
      whatsapp: '+55 63 99999-1234',
      studentId: ' ra-2024.01 ',
    });
    const result = await useCase.execute(input, {
      honeypot: '',
      elapsedMs: 4321.6,
      source: 'hero',
      idempotencyKey: 'chave-0001',
    });
    expect(result).toEqual({ status: 'success', protocol: 'HR26-ABC234' });
    expect(gateway.calls[0]).toEqual({
      participant: {
        name: 'Ana Souza',
        email: 'ana@exemplo.com',
        whatsapp: '(63) 99999-1234',
        profile: 'unicatolica',
        institution: 'UniCatólica',
        course: 'Engenharia de Software',
        period: 3,
        studentId: 'RA-2024.01',
        area: '',
        adult: true,
      },
      submittedAt: NOW.toISOString(),
      source: 'hero',
      consentVersion: CONSENT_VERSION,
      consentAt: NOW.toISOString(),
      honeypot: '',
      elapsedMs: 4322,
      idempotencyKey: 'chave-0001',
    });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('campo que não vale pro perfil não vai pra planilha', async () => {
    const { gateway, useCase } = setup();
    await useCase.execute(
      participantInput({ profile: 'self-taught', area: 'design', course: 'Direito', studentId: '123456' }),
      META,
    );
    expect(gateway.calls[0]?.participant).toMatchObject({
      course: '',
      period: 0,
      studentId: '',
      area: 'design',
    });
  });

  it('o payload não leva nada além do que a planilha guarda', async () => {
    const { gateway, useCase } = setup();
    await useCase.execute(participantInput(), META);
    expect(Object.keys(gateway.calls[0] ?? {}).sort()).toEqual(
      [
        'consentAt',
        'consentVersion',
        'elapsedMs',
        'honeypot',
        'idempotencyKey',
        'participant',
        'source',
        'submittedAt',
      ].sort(),
    );
  });

  it('aceita outra versão do aviso injetada', async () => {
    const { gateway, useCase } = setup({ consentVersion: '2027-01-v2' });
    await useCase.execute(participantInput(), META);
    expect(gateway.calls[0]?.consentVersion).toBe('2027-01-v2');
  });

  it('sem metadados usa a origem padrão, sem chave, e espera o tempo mínimo', async () => {
    const { gateway, useCase, sleep } = setup();
    await useCase.execute(participantInput());
    expect(sleep).toHaveBeenCalledWith(MIN_FILL_MS);
    expect(gateway.calls[0]).toMatchObject({
      source: 'landing-page',
      honeypot: '',
      elapsedMs: MIN_FILL_MS,
      idempotencyKey: '',
    });
  });

  it('envio mais rápido que o mínimo espera o resto em vez de cair no filtro de robô', async () => {
    const { gateway, useCase, sleep } = setup();
    await useCase.execute(participantInput(), { honeypot: '', elapsedMs: 1200 });
    expect(sleep).toHaveBeenCalledWith(MIN_FILL_MS - 1200);
    expect(gateway.calls[0]?.elapsedMs).toBe(MIN_FILL_MS);
  });

  it.each([
    ['duplicate', 'Essa inscrição já foi registrada.', false],
    ['closed', 'As inscrições estão encerradas.', false],
    ['rejected', 'A inscrição foi recusada. Revise os dados e tente novamente.', false],
    ['rate-limited', 'Muita gente se inscrevendo agora. Tente de novo em alguns segundos.', true],
  ] as const)('falha "%s" vira mensagem amigável', async (kind, message, retryable) => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError(kind, 'x'));
    expect(await useCase.execute(participantInput(), META)).toEqual({
      status: 'failed',
      reason: kind,
      message,
      retryable,
    });
  });

  it('erro do servidor dá pra tentar de novo e não fala em "recusada"', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError('server', 'x'));
    const result = await useCase.execute(participantInput(), META);
    expect(result).toMatchObject({ status: 'failed', reason: 'server', retryable: true });
    expect(result.status === 'failed' && result.message).not.toMatch(/recusad/i);
  });

  it('erro desconhecido é tratado como rede', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new TypeError('Failed to fetch'));
    const result = await useCase.execute(participantInput(), META);
    expect(result).toMatchObject({ status: 'failed', reason: 'network', retryable: true });
  });
});

describe('SubmitRegistration · status no navegador', () => {
  it('sem janela não opina (fica o status do build)', () => {
    expect(setup().useCase.currentStatus()).toBeNull();
  });

  it('usa a regra do domínio com o relógio de agora', () => {
    expect(setup({ window: windowWith() }).useCase.currentStatus()).toBe('open');
    expect(setup({ window: windowWith({ closesAt: '2026-11-02T00:00:00Z' }) }).useCase.currentStatus()).toBe(
      'closing',
    );
    expect(setup({ window: windowWith({ closesAt: '2026-10-31T23:59:00Z' }) }).useCase.currentStatus()).toBe(
      'closed',
    );
  });

  it('a lista ao vivo só soma ocupação: lotou, fecha', () => {
    const slots = { capacity: 10, taken: 4, remaining: 6, level: 'plenty' as const };
    const { useCase } = setup({ window: windowWith({ slots }) });
    expect(useCase.currentStatus(2)).toBe('open');
    expect(useCase.currentStatus(10)).toBe('closed');
  });

  it('data torta no config não derruba nada: vira "sem prazo"', () => {
    expect(setup({ window: windowWith({ closesAt: 'amanhã' }) }).useCase.currentStatus()).toBe('open');
  });

  it('prazo vencido com a página aberta: nem chama o servidor', async () => {
    const { gateway, useCase, sleep } = setup({ window: windowWith({ closesAt: '2026-10-31T23:59:00Z' }) });
    const result = await useCase.execute(participantInput(), META);
    expect(result).toEqual({
      status: 'failed',
      reason: 'closed',
      message: 'As inscrições estão encerradas.',
      retryable: false,
    });
    expect(gateway.calls).toHaveLength(0);
    expect(sleep).not.toHaveBeenCalled();
  });
});
