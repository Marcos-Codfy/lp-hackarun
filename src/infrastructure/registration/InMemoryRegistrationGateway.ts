import {
  RegistrationGatewayError,
  type RegistrationCounter,
  type RegistrationGateway,
  type RegistrationPayload,
  type RegistrationReceipt,
} from '@application/index';
import { Phone } from '@domain/index';
import { wait, type Sleep } from '@shared/utils/async';
import { fakeProtocol } from './protocol';

// dev ou prévia (PUBLIC_REGISTRATION_SIMULATED=true) sem planilha: simula a latência e devolve um protocolo
// falso, com as mesmas regras do Code.gs (mesma chave + mesmo e-mail = mesmo protocolo; e-mail, WhatsApp ou
// matrícula já inscritos = conflito). E-mail começando com "falha" simula erro de rede, "servidor" o script
// caindo e "duplicado" inscrição repetida
export class InMemoryRegistrationGateway implements RegistrationGateway, RegistrationCounter {
  readonly received: RegistrationPayload[] = [];
  private readonly protocols = new Map<string, string>();
  private readonly delayMs: number;
  private readonly sleep: Sleep;

  constructor(options: { delayMs?: number; sleep?: Sleep } = {}) {
    this.delayMs = options.delayMs ?? 900;
    this.sleep = options.sleep ?? wait;
  }

  async submit(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    await this.sleep(this.delayMs);
    const { email } = payload.participant;
    if (email.startsWith('falha')) throw new RegistrationGatewayError('network', 'Simulated failure');
    if (email.startsWith('servidor')) throw new RegistrationGatewayError('server', 'Simulated server error');
    const submission = `${payload.idempotencyKey}|${email}`;
    const previous = payload.idempotencyKey ? this.protocols.get(submission) : undefined;
    if (previous) return { protocol: previous };
    if (email.startsWith('duplicado')) throw new RegistrationGatewayError('duplicate', 'Simulated duplicate');
    this.checkConflicts(payload);
    this.received.push(payload);
    const protocol = fakeProtocol();
    this.protocols.set(submission, protocol);
    return { protocol };
  }

  taken(): Promise<number | null> {
    return Promise.resolve(this.received.length);
  }

  private checkConflicts({ participant }: RegistrationPayload): void {
    const people = this.received.map((p) => p.participant);
    if (people.some((p) => p.email === participant.email)) {
      throw new RegistrationGatewayError('duplicate-email', 'Simulated duplicate');
    }
    const digits = Phone.digitsOf(participant.whatsapp);
    if (people.some((p) => Phone.digitsOf(p.whatsapp) === digits)) {
      throw new RegistrationGatewayError('duplicate-whatsapp', 'Simulated duplicate');
    }
    if (participant.studentId && people.some((p) => p.studentId === participant.studentId)) {
      throw new RegistrationGatewayError('duplicate-student-id', 'Simulated duplicate');
    }
  }
}
