import { TeamName, type ParticipantInput } from '@domain/index';
import type {
  MilestoneDTO,
  RegistrationGateway,
  RegistrationPayload,
  RegistrationReceipt,
} from '@application/index';
import type { Clock } from '@application/index';

// equipes do sorteio: 4 de preferência, até 5
export const TEAM_SIZE = { min: 4, max: 5 };

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

// inscrição válida de aluna da UniCatólica (os testes trocam só o que interessa)
export function participantInput(overrides: Partial<ParticipantInput> = {}): ParticipantInput {
  return {
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    whatsapp: '(63) 99999-1234',
    profile: 'unicatolica',
    institution: '',
    course: 'Engenharia de Software',
    period: '3',
    studentId: '2024100123',
    area: '',
    adult: 'yes',
    acceptedTerms: true,
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
