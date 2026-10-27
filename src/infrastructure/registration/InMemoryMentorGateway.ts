import {
  RegistrationGatewayError,
  type MentorPayload,
  type MentorRegistrationGateway,
  type RegistrationReceipt,
} from '@application/index';
import { Phone } from '@domain/index';
import { wait, type Sleep } from '@shared/utils/async';
import { fakeMentorProtocol } from './protocol';

// dev ou prévia (PUBLIC_REGISTRATION_SIMULATED=true) sem planilha: simula a latência e devolve um protocolo
// falso, com as mesmas regras do Mentors.gs (mesma chave + mesmo e-mail = mesmo protocolo; e-mail ou WhatsApp já
// cadastrados = conflito). E-mail começando com "falha" simula erro de rede, "servidor" o script caindo e
// "duplicado" cadastro repetido
export class InMemoryMentorGateway implements MentorRegistrationGateway {
  readonly received: MentorPayload[] = [];
  private readonly protocols = new Map<string, string>();
  private readonly delayMs: number;
  private readonly sleep: Sleep;

  constructor(options: { delayMs?: number; sleep?: Sleep } = {}) {
    this.delayMs = options.delayMs ?? 900;
    this.sleep = options.sleep ?? wait;
  }

  async submit(payload: MentorPayload): Promise<RegistrationReceipt> {
    await this.sleep(this.delayMs);
    const { email } = payload.mentor;
    if (email.startsWith('falha')) throw new RegistrationGatewayError('network', 'Simulated failure');
    if (email.startsWith('servidor')) throw new RegistrationGatewayError('server', 'Simulated server error');
    const submission = `${payload.idempotencyKey}|${email}`;
    const previous = payload.idempotencyKey ? this.protocols.get(submission) : undefined;
    if (previous) return { protocol: previous };
    if (email.startsWith('duplicado')) throw new RegistrationGatewayError('duplicate', 'Simulated duplicate');
    this.checkConflicts(payload);
    this.received.push(payload);
    const protocol = fakeMentorProtocol();
    this.protocols.set(submission, protocol);
    return { protocol };
  }

  private checkConflicts({ mentor }: MentorPayload): void {
    const people = this.received.map((p) => p.mentor);
    if (people.some((p) => p.email === mentor.email)) {
      throw new RegistrationGatewayError('duplicate-email', 'Simulated duplicate');
    }
    const digits = Phone.digitsOf(mentor.whatsapp);
    if (people.some((p) => Phone.digitsOf(p.whatsapp) === digits)) {
      throw new RegistrationGatewayError('duplicate-whatsapp', 'Simulated duplicate');
    }
  }
}
