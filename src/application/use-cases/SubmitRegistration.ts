import { RegistrationPolicy, RegistrationWindow, Slots, TeamRegistration } from '@domain/index';
import type { RegistrationErrors, RegistrationInput, RegistrationStatus, TeamSizeRule } from '@domain/index';
import { wait, type Sleep } from '@shared/utils/async';
import type { RegistrationDTO } from '../dto';
import type { Clock } from '../ports/Clock';
import {
  RegistrationGatewayError,
  type GatewayFailure,
  type RegistrationGateway,
  type RegistrationPayload,
  type SubmissionMeta,
} from '../ports/RegistrationGateway';

const DEFAULT_META: SubmissionMeta = { honeypot: '', elapsedMs: 0 };

// versão do aviso de privacidade (/privacidade) que o checkbox aceita; mudou o texto, suba a versão
export const CONSENT_VERSION = '2026-10-v1';

// mantenha igual ao MIN_ELAPSED_MS do apps-script/Validation.gs (um teste confere)
export const MIN_FILL_MS = 3000;

// passageiras: vale tentar de novo com os mesmos dados
export const RETRYABLE_FAILURES: ReadonlySet<GatewayFailure> = new Set(['network', 'server', 'rate-limited']);

// prazo e vagas que o build manda pro navegador (o RegistrationDTO serve)
export type RegistrationWindowSnapshot = Pick<RegistrationDTO, 'endpoint' | 'closesAt' | 'slots'>;

export type SubmitRegistrationResult =
  | { status: 'invalid'; errors: RegistrationErrors }
  | { status: 'success'; protocol: string }
  | { status: 'failed'; reason: GatewayFailure; message: string; retryable: boolean };

const FAILURE_MESSAGES: Record<GatewayFailure, string> = {
  network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
  server: 'O servidor das inscrições falhou por um instante. Seus dados continuam aqui: tente de novo.',
  rejected: 'A inscrição foi recusada. Revise os dados e tente novamente.',
  closed: 'As inscrições estão encerradas.',
  duplicate: 'Esse e-mail já tem uma inscrição registrada.',
  'rate-limited': 'Muita gente se inscrevendo agora. Tenta de novo em alguns segundos.',
};

export interface SubmitRegistrationDeps {
  gateway: RegistrationGateway;
  clock: Clock;
  teamSize: TeamSizeRule;
  consentVersion?: string;
  // sem janela o caso de uso não opina sobre prazo e vagas (vale o status do build)
  window?: RegistrationWindowSnapshot;
  policy?: RegistrationPolicy;
  sleep?: Sleep;
}

export class SubmitRegistration {
  private readonly gateway: RegistrationGateway;
  private readonly clock: Clock;
  private readonly teamSize: TeamSizeRule;
  private readonly consentVersion: string;
  private readonly window: RegistrationWindow | null;
  private readonly policy: RegistrationPolicy;
  private readonly sleep: Sleep;

  constructor(deps: SubmitRegistrationDeps) {
    this.gateway = deps.gateway;
    this.clock = deps.clock;
    this.teamSize = deps.teamSize;
    this.consentVersion = deps.consentVersion ?? CONSENT_VERSION;
    this.window = deps.window ? this.toWindow(deps.window) : null;
    this.policy = deps.policy ?? new RegistrationPolicy();
    this.sleep = deps.sleep ?? wait;
  }

  // validação isolada pra feedback em tempo real no formulário
  validate(input: RegistrationInput): RegistrationErrors {
    const result = TeamRegistration.create(input, this.teamSize);
    return result.ok ? {} : result.error;
  }

  // status agora pela regra do domínio; liveTaken = confirmadas na lista ao vivo (só soma, nunca libera vaga)
  currentStatus(liveTaken = 0): RegistrationStatus | null {
    if (!this.window) return null;
    const { capacity, taken } = this.window.slots;
    const slots = Slots.create(capacity, Math.max(taken, liveTaken));
    return this.policy.statusAt(this.clock.now(), this.window.withSlots(slots));
  }

  async execute(
    input: RegistrationInput,
    meta: SubmissionMeta = DEFAULT_META,
  ): Promise<SubmitRegistrationResult> {
    const result = TeamRegistration.create(input, this.teamSize);
    if (!result.ok) return { status: 'invalid', errors: result.error };
    // o prazo venceu com a página aberta: nem chama o servidor
    if (this.currentStatus() === 'closed') return SubmitRegistration.failure('closed');

    // gente de verdade rápida demais espera o resto, em vez de cair no filtro de robô do servidor
    const missingMs = MIN_FILL_MS - meta.elapsedMs;
    if (missingMs > 0) await this.sleep(missingMs);
    try {
      const payload = this.toPayload(result.value, {
        ...meta,
        elapsedMs: Math.max(meta.elapsedMs, MIN_FILL_MS),
      });
      const receipt = await this.gateway.submit(payload);
      return { status: 'success', protocol: receipt.protocol };
    } catch (error) {
      return SubmitRegistration.failure(error instanceof RegistrationGatewayError ? error.kind : 'network');
    }
  }

  private static failure(reason: GatewayFailure): SubmitRegistrationResult {
    return {
      status: 'failed',
      reason,
      message: FAILURE_MESSAGES[reason],
      retryable: RETRYABLE_FAILURES.has(reason),
    };
  }

  // data torta ou capacidade fora da regra não podem derrubar o formulário: viram "sem limite"
  private toWindow(snapshot: RegistrationWindowSnapshot): RegistrationWindow {
    const closesAt = snapshot.closesAt ? new Date(snapshot.closesAt) : null;
    const capacity = snapshot.slots.capacity;
    return RegistrationWindow.create({
      endpoint: snapshot.endpoint,
      closesAt: closesAt && !Number.isNaN(closesAt.getTime()) ? closesAt : null,
      slots: Slots.create(
        capacity !== null && capacity > 0 ? capacity : null,
        Math.max(0, snapshot.slots.taken),
      ),
      teamSize: this.teamSize,
    });
  }

  // só chega aqui com acceptedTerms = true (o domínio barra o resto), então o envio é o aceite
  private toPayload(registration: TeamRegistration, meta: SubmissionMeta): RegistrationPayload {
    const now = this.clock.now().toISOString();
    return {
      mode: registration.mode,
      teamName: registration.teamName,
      leader: { ...registration.leader },
      members: registration.members.map((m) => ({ ...m })),
      accessibilityNeeds: registration.accessibilityNeeds,
      submittedAt: now,
      source: meta.source ?? 'landing-page',
      consentVersion: this.consentVersion,
      consentAt: now,
      honeypot: meta.honeypot,
      elapsedMs: Math.max(0, Math.round(meta.elapsedMs)),
      idempotencyKey: meta.idempotencyKey ?? '',
    };
  }
}
