import { describe, expect, it } from 'vitest';
import type { RegistrationPayload } from '@application/index';
import type { ParticipantData } from '@domain/index';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';

const person = (patch: Partial<ParticipantData> = {}): ParticipantData => ({
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  whatsapp: '(63) 99999-1234',
  profile: 'unicatolica',
  institution: 'UniCatólica',
  course: 'Engenharia de Software',
  period: 3,
  studentId: 'RA-0001',
  area: '',
  adult: true,
  ...patch,
});

const payload = (participant: Partial<ParticipantData> = {}, key = 'chave-0001'): RegistrationPayload => ({
  participant: person(participant),
  submittedAt: '',
  source: 'landing-page',
  consentVersion: 'v',
  consentAt: '',
  honeypot: '',
  elapsedMs: 5000,
  idempotencyKey: key,
});

// outra pessoa, sem nada em comum com a Ana
const other = (patch: Partial<ParticipantData> = {}) =>
  payload(
    {
      name: 'Bruno Lima',
      email: 'bruno@exemplo.com',
      whatsapp: '(63) 98888-0000',
      studentId: 'RA-0002',
      ...patch,
    },
    'chave-0002',
  );

function setup() {
  return new InMemoryRegistrationGateway({ sleep: () => Promise.resolve() });
}

describe('InMemoryRegistrationGateway (dev sem planilha)', () => {
  it('mesma chave + mesmo e-mail devolve o mesmo protocolo, como o Code.gs', async () => {
    const gateway = setup();
    const first = await gateway.submit(payload());
    await expect(gateway.submit(payload())).resolves.toEqual(first);
    expect(gateway.received).toHaveLength(1);
    await expect(gateway.taken()).resolves.toBe(1);
  });

  it.each([
    ['e-mail', { email: 'ana@exemplo.com' }, 'duplicate-email'],
    ['WhatsApp escrito de outro jeito', { whatsapp: '+55 63 99999 1234' }, 'duplicate-whatsapp'],
    ['matrícula', { studentId: 'RA-0001' }, 'duplicate-student-id'],
  ] as const)('%s já inscrito é conflito', async (_case, patch, kind) => {
    const gateway = setup();
    await gateway.submit(payload());
    await expect(gateway.submit(other(patch))).rejects.toMatchObject({ kind });
  });

  it('matrícula vazia não conta como repetida', async () => {
    const gateway = setup();
    await gateway.submit(payload({ studentId: '' }));
    await expect(gateway.submit(other({ studentId: '' }))).resolves.toHaveProperty('protocol');
    await expect(gateway.taken()).resolves.toBe(2);
  });

  it.each([
    ['falha@exemplo.com', 'network'],
    ['servidor@exemplo.com', 'server'],
    ['duplicado@exemplo.com', 'duplicate'],
  ])('e-mail %s simula "%s"', async (email, kind) => {
    await expect(setup().submit(payload({ email }))).rejects.toMatchObject({ kind });
  });
});
