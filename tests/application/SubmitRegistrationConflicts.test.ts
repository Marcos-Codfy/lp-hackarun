import { describe, expect, it } from 'vitest';
import { RegistrationGatewayError, SubmitRegistration } from '@application/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { FakeGateway, TEAM_SIZE, participantInput } from '../helpers/fixtures';

const META = { honeypot: '', elapsedMs: 8000 };

function setup() {
  const gateway = new FakeGateway();
  const useCase = new SubmitRegistration({
    gateway,
    clock: new FixedClock(new Date('2026-11-01T12:00:00Z')),
    teamSize: TEAM_SIZE,
    sleep: () => Promise.resolve(),
  });
  return { gateway, useCase };
}

describe('SubmitRegistration · já tem inscrição', () => {
  it.each([
    ['duplicate-email', 'email', 'Esse e-mail já tem uma inscrição.'],
    ['duplicate-whatsapp', 'whatsapp', 'Esse WhatsApp já tem uma inscrição.'],
    ['duplicate-student-id', 'studentId', 'Essa matrícula já tem uma inscrição.'],
  ] as const)('%s vira erro no campo %s', async (kind, field, message) => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError(kind, 'x'));
    const result = await useCase.execute(participantInput(), META);
    expect(result.status).toBe('conflict');
    expect(result.status === 'conflict' && result.errors).toEqual({ [field]: message });
    expect(result.status === 'conflict' && result.message).toContain('Cada pessoa se inscreve uma vez só.');
  });

  it('inscrição repetida inteira (mesmo envio já gravado de outro jeito) é falha sem "Tentar de novo"', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError('duplicate', 'x'));
    expect(await useCase.execute(participantInput(), META)).toEqual({
      status: 'failed',
      reason: 'duplicate',
      message: 'Essa inscrição já foi registrada.',
      retryable: false,
    });
  });
});
