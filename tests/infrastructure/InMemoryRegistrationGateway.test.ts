import { describe, expect, it } from 'vitest';
import type { RegistrationPayload } from '@application/index';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';

const payload = (email: string, idempotencyKey: string) =>
  ({ leader: { email }, idempotencyKey }) as RegistrationPayload;

function setup() {
  return new InMemoryRegistrationGateway({ sleep: () => Promise.resolve() });
}

describe('InMemoryRegistrationGateway (dev sem planilha)', () => {
  it('mesma chave + mesmo e-mail devolve o mesmo protocolo, como o Code.gs', async () => {
    const gateway = setup();
    const first = await gateway.submit(payload('ana@exemplo.com', 'chave-0001'));
    await expect(gateway.submit(payload('ana@exemplo.com', 'chave-0001'))).resolves.toEqual(first);
    expect(gateway.received).toHaveLength(1);
  });

  it('outra chave com o mesmo e-mail é inscrição repetida', async () => {
    const gateway = setup();
    await gateway.submit(payload('ana@exemplo.com', 'chave-0001'));
    await expect(gateway.submit(payload('ana@exemplo.com', 'chave-0002'))).rejects.toMatchObject({
      kind: 'duplicate',
    });
  });

  it.each([
    ['falha@exemplo.com', 'network'],
    ['servidor@exemplo.com', 'server'],
    ['duplicado@exemplo.com', 'duplicate'],
  ])('e-mail %s simula "%s"', async (email, kind) => {
    await expect(setup().submit(payload(email, 'chave-0001'))).rejects.toMatchObject({ kind });
  });
});
