import { TeamRegistration } from '@domain/index';
import type { RegistrationErrors, RegistrationInput, TeamSizeRule } from '@domain/index';
import type { Clock } from '../ports/Clock';
import {
  RegistrationGatewayError,
  type GatewayFailure,
  type RegistrationGateway,
  type RegistrationPayload,
} from '../ports/RegistrationGateway';

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

  constructor(deps: { gateway: RegistrationGateway; clock: Clock; teamSize: TeamSizeRule }) {
    this.gateway = deps.gateway;
    this.clock = deps.clock;
    this.teamSize = deps.teamSize;
  }

  // validação isolada pra feedback em tempo real no formulário
  validate(input: RegistrationInput): RegistrationErrors {
    const result = TeamRegistration.create(input, this.teamSize);
    return result.ok ? {} : result.error;
  }

  async execute(input: RegistrationInput): Promise<SubmitRegistrationResult> {
    const result = TeamRegistration.create(input, this.teamSize);
    if (!result.ok) return { status: 'invalid', errors: result.error };

    try {
      const receipt = await this.gateway.submit(this.toPayload(result.value));
      return { status: 'success', protocol: receipt.protocol };
    } catch (error) {
      const reason = error instanceof RegistrationGatewayError ? error.kind : 'network';
      return { status: 'failed', reason, message: FAILURE_MESSAGES[reason] };
    }
  }

  private toPayload(registration: TeamRegistration): RegistrationPayload {
    return {
      mode: registration.mode,
      teamName: registration.teamName,
      leader: { ...registration.leader },
      members: registration.members.map((m) => ({ ...m })),
      accessibilityNeeds: registration.accessibilityNeeds,
      submittedAt: this.clock.now().toISOString(),
      source: 'landing-page',
    };
  }
}
