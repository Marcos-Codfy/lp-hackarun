import {
  RegistrationGatewayError,
  type RegistrationGateway,
  type RegistrationPayload,
  type RegistrationReceipt,
} from '@application/index';
import { wait, type Sleep } from '@shared/utils/async';
import { normalizeSearch } from '@shared/utils/text';
import { fakeProtocol } from './protocol';
import type { SimulatedTeamStore } from './SimulatedTeamStore';

const nameKey = (name: string) => normalizeSearch(name).replace(/\s+/g, ' ');

// posições dos valores que outra equipe já usou
const takenIndexes = (values: readonly string[], used: ReadonlySet<string>): number[] =>
  values.flatMap((value, i) => (used.has(value) ? [i] : []));

// só pro dev sem planilha: simula a latência e devolve um protocolo falso, com as mesmas regras do Code.gs
// (mesma chave + mesmo contato = mesmo protocolo; nome, e-mail ou matrícula já inscritos = conflito).
// E-mail de contato começando com "falha" simula erro de rede, "servidor" o script caindo e "duplicado"
// inscrição repetida. Com store, a equipe (e a foto) vai pra lista simulada de /equipes
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
    const contact = payload.members[0]?.email ?? '';
    if (contact.startsWith('falha')) throw new RegistrationGatewayError('network', 'Simulated failure');
    if (contact.startsWith('servidor'))
      throw new RegistrationGatewayError('server', 'Simulated server error');
    const submission = `${payload.idempotencyKey}|${contact}`;
    const previous = payload.idempotencyKey ? this.protocols.get(submission) : undefined;
    if (previous) return { protocol: previous };
    if (contact.startsWith('duplicado'))
      throw new RegistrationGatewayError('duplicate', 'Simulated duplicate');
    this.checkConflicts(payload);
    this.received.push(payload);
    const protocol = fakeProtocol();
    this.protocols.set(submission, protocol);
    this.store?.add(payload, protocol);
    return { protocol };
  }

  private checkConflicts(payload: RegistrationPayload): void {
    // a lista simulada sobrevive ao recarregar a página (sessionStorage): o nome também conta
    const known = [...this.received.map((p) => p.teamName), ...(this.store?.list() ?? []).map((t) => t.name)];
    const names = new Set(known.map(nameKey));
    if (names.has(nameKey(payload.teamName))) {
      throw new RegistrationGatewayError('duplicate-team-name', 'Simulated duplicate team name');
    }
    const members = this.received.flatMap((p) => p.members);
    const emails = takenIndexes(
      payload.members.map((m) => m.email),
      new Set(members.map((m) => m.email)),
    );
    if (emails.length) throw new RegistrationGatewayError('duplicate-email', 'Simulated duplicate', emails);
    const ids = takenIndexes(
      payload.members.map((m) => m.studentId),
      new Set(members.map((m) => m.studentId)),
    );
    if (ids.length) throw new RegistrationGatewayError('duplicate-student-id', 'Simulated duplicate', ids);
  }
}
