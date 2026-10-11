import { TeamRegistration } from '@domain/index';
import type { RegistrationErrors, RegistrationInput, TeamSizeRule } from '@domain/index';
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

export type SubmitRegistrationResult =
  | { status: 'invalid'; errors: RegistrationErrors }
  | { status: 'success'; protocol: string }
  | { status: 'failed'; reason: GatewayFailure; message: string };

const FAILURE_MESSAGES: Record<GatewayFailure, string> = {
  network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
  rejected: 'A inscrição foi recusada. Revise os dados e tente novamente.',
  closed: 'As inscrições estão encerradas.',
  duplicate: 'Esse e-mail já tem uma inscrição registrada.',
  'rate-limited': 'Muita gente se inscrevendo agora. Tenta de novo em alguns segundos.',
};

export class SubmitRegistration {
  private readonly gateway: RegistrationGateway;
  private readonly clock: Clock;
  private readonly teamSize: TeamSizeRule;
  private readonly consentVersion: string;

  constructor(deps: {
    gateway: RegistrationGateway;
    clock: Clock;
    teamSize: TeamSizeRule;
    consentVersion?: string;
  }) {
    this.gateway = deps.gateway;
    this.clock = deps.clock;
    this.teamSize = deps.teamSize;
    this.consentVersion = deps.consentVersion ?? CONSENT_VERSION;
  }

  // validação isolada pra feedback em tempo real no formulário
  validate(input: RegistrationInput): RegistrationErrors {
    const result = TeamRegistration.create(input, this.teamSize);
    return result.ok ? {} : result.error;
  }

  async execute(
    input: RegistrationInput,
    meta: SubmissionMeta = DEFAULT_META,
  ): Promise<SubmitRegistrationResult> {
    const result = TeamRegistration.create(input, this.teamSize);
    if (!result.ok) return { status: 'invalid', errors: result.error };

    try {
      const receipt = await this.gateway.submit(this.toPayload(result.value, meta));
      return { status: 'success', protocol: receipt.protocol };
    } catch (error) {
      const reason = error instanceof RegistrationGatewayError ? error.kind : 'network';
      return { status: 'failed', reason, message: FAILURE_MESSAGES[reason] };
    }
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
    };
  }
}
