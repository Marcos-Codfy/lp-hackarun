import {
  RegistrationGatewayError,
  type RegistrationGateway,
  type RegistrationPayload,
  type RegistrationReceipt,
} from '@application/index';
import { fakeProtocol } from './protocol';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// só pro dev sem planilha: simula a latência e devolve um protocolo falso.
// e-mail começando com "falha" simula erro de rede; "duplicado" simula inscrição repetida
export class InMemoryRegistrationGateway implements RegistrationGateway {
  readonly received: RegistrationPayload[] = [];
  private readonly delayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: { delayMs?: number; sleep?: (ms: number) => Promise<void> } = {}) {
    this.delayMs = options.delayMs ?? 900;
    this.sleep = options.sleep ?? wait;
  }

  async submit(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    await this.sleep(this.delayMs);
    const email = payload.leader.email;
    if (email.startsWith('falha')) throw new RegistrationGatewayError('network', 'Simulated failure');
    const repeated = this.received.some((p) => p.leader.email === email) || email.startsWith('duplicado');
    if (repeated) throw new RegistrationGatewayError('duplicate', 'Simulated duplicate');
    this.received.push(payload);
    return { protocol: fakeProtocol() };
  }
}
