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
import { FakeGateway, TEAM_SIZE, teamInput } from '../helpers/fixtures';
import { TEAM_IMAGE } from '../helpers/images';

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
    const result = await useCase.execute(teamInput({ acceptedTerms: false }));
    expect(result.status).toBe('invalid');
    expect(result.status === 'invalid' && result.errors['acceptedTerms']).toBeTruthy();
    expect(gateway.calls).toHaveLength(0);
  });

  it('validate devolve {} quando está tudo certo', () => {
    expect(setup().useCase.validate(teamInput())).toEqual({});
  });

  it('envia o payload normalizado com os metadados anti-spam e a chave do envio', async () => {
    const { gateway, useCase, sleep } = setup();
    gateway.willReturn('HR26-ABC234');
    const result = await useCase.execute(
      teamInput({ leader: { ...teamInput().leader, phone: '63999991234' } }),
      { honeypot: '', elapsedMs: 4321.6, source: 'hero', idempotencyKey: 'chave-0001' },
    );
    expect(result).toEqual({ status: 'success', protocol: 'HR26-ABC234' });
    expect(gateway.calls[0]).toMatchObject({
      mode: 'team',
      teamName: 'Bug Busters',
      leader: { phone: '(63) 99999-1234', email: 'ana@exemplo.com' },
      submittedAt: NOW.toISOString(),
      source: 'hero',
      honeypot: '',
      elapsedMs: 4322,
      idempotencyKey: 'chave-0001',
    });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('registra o consentimento (versão do aviso + quando) junto com a inscrição', async () => {
    const { gateway, useCase } = setup();
    await useCase.execute(teamInput(), META);
    expect(gateway.calls[0]).toMatchObject({ consentVersion: CONSENT_VERSION, consentAt: NOW.toISOString() });
  });

  it('a foto da equipe vai no mesmo envio (base64, sem o tamanho em pixels); individual manda null', async () => {
    const { gateway, useCase } = setup();
    await useCase.execute(teamInput(), META);
    expect(gateway.calls[0]?.teamImage).toEqual(TEAM_IMAGE);
    await useCase.execute(
      teamInput({ mode: 'solo', leader: { ...teamInput().leader, email: 'b@exemplo.com' } }),
      META,
    );
    expect(gateway.calls[1]?.teamImage).toBeNull();
  });

  it('equipe sem foto nem chega no gateway', async () => {
    const { gateway, useCase } = setup();
    const result = await useCase.execute(teamInput({ teamImage: null }), META);
    expect(result.status === 'invalid' && result.errors['teamImage']).toBeTruthy();
    expect(gateway.calls).toHaveLength(0);
  });

  it('aceita outra versão do aviso injetada', async () => {
    const { gateway, useCase } = setup({ consentVersion: '2027-01-v2' });
    await useCase.execute(teamInput(), META);
    expect(gateway.calls[0]?.consentVersion).toBe('2027-01-v2');
  });

  it('sem metadados usa a origem padrão, sem chave, e espera o tempo mínimo', async () => {
    const { gateway, useCase, sleep } = setup();
    await useCase.execute(teamInput());
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
    await useCase.execute(teamInput(), { honeypot: '', elapsedMs: 1200 });
    expect(sleep).toHaveBeenCalledWith(MIN_FILL_MS - 1200);
    expect(gateway.calls[0]?.elapsedMs).toBe(MIN_FILL_MS);
  });

  it.each([
    ['duplicate', 'Esse e-mail já tem uma inscrição registrada.', false],
    ['closed', 'As inscrições estão encerradas.', false],
    ['rejected', 'A inscrição foi recusada. Revise os dados e tente novamente.', false],
    ['rate-limited', 'Muita gente se inscrevendo agora. Tenta de novo em alguns segundos.', true],
  ] as const)('falha "%s" vira mensagem amigável', async (kind, message, retryable) => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError(kind, 'x'));
    expect(await useCase.execute(teamInput(), META)).toEqual({
      status: 'failed',
      reason: kind,
      message,
      retryable,
    });
  });

  it('erro do servidor dá pra tentar de novo e não fala em "recusada"', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError('server', 'x'));
    const result = await useCase.execute(teamInput(), META);
    expect(result).toMatchObject({ status: 'failed', reason: 'server', retryable: true });
    expect(result.status === 'failed' && result.message).not.toMatch(/recusad/i);
  });

  it('erro desconhecido é tratado como rede', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new TypeError('Failed to fetch'));
    const result = await useCase.execute(teamInput(), META);
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
    const result = await useCase.execute(teamInput(), META);
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
