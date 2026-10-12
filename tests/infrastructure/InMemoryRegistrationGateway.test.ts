import { describe, expect, it } from 'vitest';
import type { RegistrationPayload } from '@application/index';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';
import { TEAM_IMAGE } from '../helpers/images';

const person = (email: string, studentId: string) => ({ name: 'Pessoa Teste', studentId, email });

const payload = (patch: Partial<RegistrationPayload> = {}): RegistrationPayload => ({
  teamName: 'Bug Busters',
  members: [person('ana@exemplo.com', 'RA-0001'), person('bruno@exemplo.com', 'RA-0002')],
  teamImage: TEAM_IMAGE,
  submittedAt: '',
  source: 'landing-page',
  consentVersion: 'v',
  consentAt: '',
  honeypot: '',
  elapsedMs: 5000,
  idempotencyKey: 'chave-0001',
  ...patch,
});

const other = (patch: Partial<RegistrationPayload> = {}) =>
  payload({
    teamName: 'Null Pointers',
    members: [person('carla@exemplo.com', 'RA-0003'), person('davi@exemplo.com', 'RA-0004')],
    idempotencyKey: 'chave-0002',
    ...patch,
  });

function setup() {
  return new InMemoryRegistrationGateway({ sleep: () => Promise.resolve() });
}

describe('InMemoryRegistrationGateway (dev sem planilha)', () => {
  it('mesma chave + mesmo contato devolve o mesmo protocolo, como o Code.gs', async () => {
    const gateway = setup();
    const first = await gateway.submit(payload());
    await expect(gateway.submit(payload())).resolves.toEqual(first);
    expect(gateway.received).toHaveLength(1);
  });

  it('nome repetido (sem acento e sem caixa) é conflito de nome', async () => {
    const gateway = setup();
    await gateway.submit(payload());
    await expect(gateway.submit(other({ teamName: 'bug bústers' }))).rejects.toMatchObject({
      kind: 'duplicate-team-name',
    });
  });

  it('e-mail ou matrícula de outra equipe aponta a posição do integrante', async () => {
    const gateway = setup();
    await gateway.submit(payload());
    const borrowed = other().members.map((m, i) => (i === 1 ? { ...m, email: 'ana@exemplo.com' } : m));
    await expect(gateway.submit(other({ members: borrowed }))).rejects.toMatchObject({
      kind: 'duplicate-email',
      memberIndexes: [1],
    });
    const sameId = other().members.map((m, i) => (i === 0 ? { ...m, studentId: 'RA-0002' } : m));
    await expect(gateway.submit(other({ members: sameId }))).rejects.toMatchObject({
      kind: 'duplicate-student-id',
      memberIndexes: [0],
    });
  });

  it.each([
    ['falha@exemplo.com', 'network'],
    ['servidor@exemplo.com', 'server'],
    ['duplicado@exemplo.com', 'duplicate'],
  ])('e-mail de contato %s simula "%s"', async (email, kind) => {
    const members = [person(email, 'RA-0009'), person('b@exemplo.com', 'RA-0010')];
    await expect(setup().submit(payload({ members }))).rejects.toMatchObject({ kind });
  });
});
