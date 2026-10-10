import { describe, expect, it, vi } from 'vitest';
import { RegistrationGatewayError, type RegistrationPayload } from '@application/index';
import { RetryingRegistrationGateway } from '@infrastructure/registration/RetryingRegistrationGateway';
import { FakeGateway } from '../helpers/fixtures';

const payload = {} as RegistrationPayload;
const network = () => new RegistrationGatewayError('network', 'offline');

function setup(inner: FakeGateway) {
  const sleep = vi.fn((_ms: number) => Promise.resolve());
  const gateway = new RetryingRegistrationGateway(inner, { sleep, random: () => 0.5, baseDelayMs: 100 });
  return { gateway, sleep };
}

describe('RetryingRegistrationGateway', () => {
  it('tenta de novo falhas de rede e devolve o sucesso', async () => {
    const inner = new FakeGateway().willThrow(network()).willThrow(network()).willReturn('HR26-OK2345');
    const { gateway, sleep } = setup(inner);
    await expect(gateway.submit(payload)).resolves.toEqual({ protocol: 'HR26-OK2345' });
    expect(inner.calls).toHaveLength(3);
    // backoff exponencial + jitter: 100 + 50, 200 + 50
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([150, 250]);
  });

  it('tenta de novo "rate-limited"', async () => {
    const inner = new FakeGateway()
      .willThrow(new RegistrationGatewayError('rate-limited', 'x'))
      .willReturn('HR26-OK');
    await expect(setup(inner).gateway.submit(payload)).resolves.toEqual({ protocol: 'HR26-OK' });
  });

  it('desiste depois de 3 tentativas', async () => {
    const inner = new FakeGateway().willThrow(network()).willThrow(network()).willThrow(network());
    const { gateway, sleep } = setup(inner);
    await expect(gateway.submit(payload)).rejects.toMatchObject({ kind: 'network' });
    expect(inner.calls).toHaveLength(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('não insiste no que não é passageiro', async () => {
    const inner = new FakeGateway().willThrow(new RegistrationGatewayError('duplicate', 'x'));
    const { gateway, sleep } = setup(inner);
    await expect(gateway.submit(payload)).rejects.toMatchObject({ kind: 'duplicate' });
    expect(inner.calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
