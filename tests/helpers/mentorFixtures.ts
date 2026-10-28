import type { MentorInput } from '@domain/index';
import type { MentorPayload, MentorRegistrationGateway, RegistrationReceipt } from '@application/index';

// cadastro de mentor válido (egresso de Engenharia de Software); os testes trocam só o que interessa
export function mentorInput(overrides: Partial<MentorInput> = {}): MentorInput {
  return {
    name: 'Ana Souza',
    email: 'ana.mentora@exemplo.com',
    whatsapp: '(63) 99999-0101',
    area: 'security',
    areaOther: '',
    specialties: 'Pentest, AWS',
    linkedin: 'https://www.linkedin.com/in/ana-souza',
    graduate: 'yes',
    course: 'Engenharia de Software',
    graduationYear: '2019',
    days: ['13', '14'],
    mayPublish: true,
    acceptedTerms: true,
    ...overrides,
  };
}

// gateway falso: grava o payload e responde o que o teste mandar
export class FakeMentorGateway implements MentorRegistrationGateway {
  readonly calls: MentorPayload[] = [];
  private responses: (() => Promise<RegistrationReceipt>)[] = [];

  willReturn(protocol: string): this {
    this.responses.push(() => Promise.resolve({ protocol }));
    return this;
  }

  willThrow(error: unknown): this {
    this.responses.push(() => Promise.reject(error));
    return this;
  }

  submit(payload: MentorPayload): Promise<RegistrationReceipt> {
    this.calls.push(payload);
    const next = this.responses.shift();
    return next ? next() : Promise.resolve({ protocol: 'MT26-TESTE1' });
  }
}
