import { describe, expect, it } from 'vitest';
import { RegistrationGatewayError, SubmitRegistration } from '@application/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { FakeGateway, TEAM_SIZE, teamInput } from '../helpers/fixtures';

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

describe('SubmitRegistration · já inscrito em outra equipe', () => {
  it('nome repetido vira erro no campo do nome', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError('duplicate-team-name', 'x'));
    expect(await useCase.execute(teamInput(), META)).toEqual({
      status: 'conflict',
      reason: 'duplicate-team-name',
      errors: { teamName: 'Esse nome já é de outra equipe inscrita. Escolha outro.' },
      message: 'Já existe uma equipe inscrita com esse nome. Escolha outro.',
    });
  });

  it('e-mail e matrícula repetidos apontam o integrante certo', async () => {
    const { gateway, useCase } = setup();
    gateway
      .willThrow(new RegistrationGatewayError('duplicate-email', 'x', [1]))
      .willThrow(new RegistrationGatewayError('duplicate-student-id', 'x', [0, 1]));
    const email = await useCase.execute(teamInput(), META);
    expect(email.status === 'conflict' && email.errors).toEqual({
      'members.1.email': 'Esse e-mail já está em outra equipe inscrita.',
    });
    const ids = await useCase.execute(teamInput(), META);
    expect(ids.status === 'conflict' && Object.keys(ids.errors)).toEqual([
      'members.0.studentId',
      'members.1.studentId',
    ]);
  });

  it('sem a posição (ou com posição fora da equipe) vira a mensagem geral, sem "Tentar de novo"', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError('duplicate-email', 'x', [7]));
    expect(await useCase.execute(teamInput(), META)).toEqual({
      status: 'failed',
      reason: 'duplicate-email',
      message: 'Um dos e-mails já está em outra equipe inscrita. Cada pessoa participa de uma equipe só.',
      retryable: false,
    });
  });
});
