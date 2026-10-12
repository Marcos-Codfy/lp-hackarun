import { TeamName, type RegistrationInput } from '@domain/index';
import type {
  MilestoneDTO,
  RegistrationGateway,
  RegistrationPayload,
  RegistrationReceipt,
} from '@application/index';
import type { Clock } from '@application/index';
import { TEAM_IMAGE } from './images';

export const TEAM_SIZE = { min: 2, max: 5 };

// nome de equipe válido sem desembrulhar o Result em todo teste
export function teamName(raw: string): TeamName {
  const name = TeamName.create(raw);
  if (!name.ok) throw new Error(name.error);
  return name.value;
}

export const MILESTONES: MilestoneDTO[] = [
  { key: 'kickoff', label: 'O HackaRun começa em', at: '2026-11-11T19:00:00-03:00' },
  { key: 'submission', label: 'Entrega final em', at: '2026-11-14T15:00:00-03:00' },
  { key: 'ceremony', label: 'A premiação começa em', at: '2026-11-14T18:00:00-03:00' },
];

export const MEMBER_ANA = { name: 'Ana Souza', studentId: '2024100123', email: 'ana@exemplo.com' };
export const MEMBER_BRUNO = { name: 'Bruno Lima', studentId: '2024100456', email: 'bruno@exemplo.com' };

// integrante válido número n (matrícula e e-mail únicos)
export const member = (n: number) => ({
  name: 'Pessoa Integrante',
  studentId: `RA-${String(n).padStart(4, '0')}`,
  email: `p${n}@exemplo.com`,
});

export function teamInput(overrides: Partial<RegistrationInput> = {}): RegistrationInput {
  return {
    teamName: 'Bug Busters',
    members: [{ ...MEMBER_ANA }, { ...MEMBER_BRUNO }],
    acceptedTerms: true,
    teamImage: TEAM_IMAGE,
    ...overrides,
  };
}

// relógio que dá pra adiantar na mão
export class ManualClock implements Clock {
  private current: number;

  constructor(iso: string) {
    this.current = new Date(iso).getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }
}

// gateway falso: grava o payload e responde o que o teste mandar
export class FakeGateway implements RegistrationGateway {
  readonly calls: RegistrationPayload[] = [];
  private responses: (() => Promise<RegistrationReceipt>)[] = [];

  willReturn(protocol: string): this {
    this.responses.push(() => Promise.resolve({ protocol }));
    return this;
  }

  willThrow(error: unknown): this {
    this.responses.push(() => Promise.reject(error));
    return this;
  }

  submit(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    this.calls.push(payload);
    const next = this.responses.shift();
    return next ? next() : Promise.resolve({ protocol: 'HR26-TESTE1' });
  }
}
