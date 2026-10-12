import {
  RegistrationGatewayError,
  type RegistrationGateway,
  type RegistrationPayload,
  type RegistrationReceipt,
} from '@application/index';
import { wait, type Sleep } from '@shared/utils/async';
import { fakeProtocol } from './protocol';
import type { SimulatedTeamStore } from './SimulatedTeamStore';

// só pro dev sem planilha: simula a latência e devolve um protocolo falso, com a mesma idempotência do
// Code.gs (mesma chave + mesmo e-mail = mesmo protocolo). E-mail começando com "falha" simula erro de rede,
// "servidor" simula o script caindo e "duplicado" simula inscrição repetida. Com store, a equipe (e a foto)
// vai pra lista simulada de /equipes
export class InMemoryRegistrationGateway implements RegistrationGateway {
  readonly received: RegistrationPayload[] = [];
  private readonly protocols = new Map<string, string>();
  private readonly delayMs: number;
  private readonly sleep: Sleep;
  private readonly store: SimulatedTeamStore | null;

  constructor(options: { delayMs?: number; sleep?: Sleep; store?: SimulatedTeamStore } = {}) {
    this.delayMs = options.delayMs ?? 900;
    this.sleep = options.sleep ?? wait;
    this.store = options.store ?? null;
  }

  async submit(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    await this.sleep(this.delayMs);
    const email = payload.leader.email;
    if (email.startsWith('falha')) throw new RegistrationGatewayError('network', 'Simulated failure');
    if (email.startsWith('servidor')) throw new RegistrationGatewayError('server', 'Simulated server error');
    const submission = `${payload.idempotencyKey}|${email}`;
    const previous = payload.idempotencyKey ? this.protocols.get(submission) : undefined;
    if (previous) return { protocol: previous };
    const repeated = this.received.some((p) => p.leader.email === email) || email.startsWith('duplicado');
    if (repeated) throw new RegistrationGatewayError('duplicate', 'Simulated duplicate');
    this.received.push(payload);
    const protocol = fakeProtocol();
    this.protocols.set(submission, protocol);
    this.store?.add(payload, protocol);
    return { protocol };
  }
}
