import { describe, expect, it } from 'vitest';
import { RegistrationGatewayError, SubmitRegistration } from '@application/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { FakeGateway, TEAM_SIZE, teamInput } from '../helpers/fixtures';

const NOW = new Date('2026-11-01T12:00:00Z');

function setup() {
  const gateway = new FakeGateway();
  const useCase = new SubmitRegistration({ gateway, clock: new FixedClock(NOW), teamSize: TEAM_SIZE });
  return { gateway, useCase };
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

  it('envia o payload normalizado com os metadados anti-spam', async () => {
    const { gateway, useCase } = setup();
    gateway.willReturn('HR26-ABC234');
    const result = await useCase.execute(
      teamInput({ leader: { ...teamInput().leader, phone: '63999991234' } }),
      {
        honeypot: '',
        elapsedMs: 4321.6,
        source: 'hero',
      },
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
    });
  });

  it('sem metadados usa a origem padrão', async () => {
    const { gateway, useCase } = setup();
    await useCase.execute(teamInput());
    expect(gateway.calls[0]).toMatchObject({ source: 'landing-page', honeypot: '', elapsedMs: 0 });
  });

  it.each([
    ['duplicate', 'Esse e-mail já tem uma inscrição registrada.'],
    ['closed', 'As inscrições estão encerradas.'],
    ['rate-limited', 'Muita gente se inscrevendo agora. Tenta de novo em alguns segundos.'],
  ] as const)('falha "%s" vira mensagem amigável', async (kind, message) => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new RegistrationGatewayError(kind, 'x'));
    expect(await useCase.execute(teamInput())).toEqual({ status: 'failed', reason: kind, message });
  });

  it('erro desconhecido é tratado como rede', async () => {
    const { gateway, useCase } = setup();
    gateway.willThrow(new TypeError('Failed to fetch'));
    const result = await useCase.execute(teamInput());
    expect(result.status === 'failed' && result.reason).toBe('network');
  });
});
