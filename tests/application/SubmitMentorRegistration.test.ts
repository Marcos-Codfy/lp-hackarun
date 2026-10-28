import { describe, expect, it, vi } from 'vitest';
import {
  MENTOR_CONSENT_VERSION,
  MIN_FILL_MS,
  RegistrationGatewayError,
  SubmitMentorRegistration,
  type SubmitMentorDeps,
} from '@application/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { FakeMentorGateway, mentorInput } from '../helpers/mentorFixtures';

const NOW = new Date('2026-11-01T12:00:00Z');
const META = { honeypot: '', elapsedMs: 8000 };

function setup(deps: Partial<SubmitMentorDeps> = {}) {
  const gateway = new FakeMentorGateway();
  const sleep = vi.fn((_ms: number) => Promise.resolve());
  const useCase = new SubmitMentorRegistration({ gateway, clock: new FixedClock(NOW), sleep, ...deps });
  return { gateway, useCase, sleep };
}

describe('SubmitMentorRegistration', () => {
  it('dados inválidos nem chegam no gateway', async () => {
    const { gateway, useCase } = setup();
    const result = await useCase.execute(mentorInput({ acceptedTerms: false }));
    expect(result.status).toBe('invalid');
    expect(result.status === 'invalid' && result.errors['acceptedTerms']).toBeTruthy();
    expect(gateway.calls).toHaveLength(0);
  });

  it('validate devolve {} quando está tudo certo e os erros quando não', () => {
    const { useCase } = setup();
    expect(useCase.validate(mentorInput())).toEqual({});
    expect(Object.keys(useCase.validate(mentorInput({ days: [] })))).toEqual(['days']);
  });

  it('envia o payload normalizado com o aceite, a origem padrão e a chave do envio', async () => {
    const { gateway, useCase } = setup();
    gateway.willReturn('MT26-ABC234');
    const result = await useCase.execute(mentorInput({ email: 'Ana.Mentora@Exemplo.com' }), {
      honeypot: '',
      elapsedMs: 4321.6,
      idempotencyKey: '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40',
    });
    expect(result).toEqual({ status: 'success', protocol: 'MT26-ABC234' });
    const payload = gateway.calls[0];
    expect(payload?.mentor.email).toBe('ana.mentora@exemplo.com');
    expect(payload?.mentor.days).toEqual(['13', '14']);
    expect(payload).toMatchObject({
      source: 'mentor-page',
      consentVersion: MENTOR_CONSENT_VERSION,
      consentAt: NOW.toISOString(),
      submittedAt: NOW.toISOString(),
      honeypot: '',
      elapsedMs: 4322,
      idempotencyKey: '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40',
    });
    expect(Object.keys(payload ?? {}).sort()).toEqual([
      'consentAt',
      'consentVersion',
      'elapsedMs',
      'honeypot',
      'idempotencyKey',
      'mentor',
      'source',
      'submittedAt',
    ]);
  });

  it('a versão do aviso é a dos mentores (m1), diferente da inscrição', () => {
    expect(MENTOR_CONSENT_VERSION).toBe('2026-10-m1');
  });

  it('quem preenche rápido demais espera o resto do tempo mínimo, e o tempo enviado nunca é menor', async () => {
    const { gateway, useCase, sleep } = setup();
    await useCase.execute(mentorInput(), { honeypot: '', elapsedMs: 1000 });
    expect(sleep).toHaveBeenCalledWith(MIN_FILL_MS - 1000);
    expect(gateway.calls[0]?.elapsedMs).toBe(MIN_FILL_MS);
  });

  it('quem demorou o suficiente não espera', async () => {
    const { useCase, sleep } = setup();
    await useCase.execute(mentorInput(), META);
    expect(sleep).not.toHaveBeenCalled();
  });

  it.each([
    ['duplicate-email', 'email'],
    ['duplicate-whatsapp', 'whatsapp'],
  ] as const)('conflito %s vira erro no campo %s', async (kind, field) => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError(kind, 'x'));
    const result = await useCase.execute(mentorInput(), META);
    expect(result.status).toBe('conflict');
    if (result.status !== 'conflict') return;
    expect(Object.keys(result.errors)).toEqual([field]);
    expect(result.message).toMatch(/já está cadastrado/);
  });

  it.each([
    ['network', true],
    ['server', true],
    ['rate-limited', true],
    ['closed', false],
    ['rejected', false],
    ['duplicate', false],
  ] as const)('falha %s: tentar de novo = %s', async (kind, retryable) => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError(kind, 'x'));
    const result = await useCase.execute(mentorInput(), META);
    expect(result).toMatchObject({ status: 'failed', reason: kind, retryable });
  });

  it('as mensagens falam em cadastro, não em inscrição', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError('closed', 'x'));
    const result = await useCase.execute(mentorInput(), META);
    expect(result.status === 'failed' && result.message).toBe('O cadastro de mentores está encerrado.');
  });

  it('erro que não é do gateway vira falha de rede (passageira)', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new TypeError('boom'));
    const result = await useCase.execute(mentorInput(), META);
    expect(result).toMatchObject({ status: 'failed', reason: 'network', retryable: true });
  });
});
