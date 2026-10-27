import { MentorRegistration } from '@domain/index';
import type { MentorErrors, MentorInput } from '@domain/index';
import { wait, type Sleep } from '@shared/utils/async';
import type { Clock } from '../ports/Clock';
import type {
  MentorPayload,
  MentorRegistrationGateway,
  MentorSubmissionMeta,
} from '../ports/MentorRegistrationGateway';
import { RegistrationGatewayError, type GatewayFailure } from '../ports/RegistrationGateway';
import { RETRYABLE_FAILURES } from './registrationFailures';
import {
  MENTOR_FAILURE_MESSAGES,
  isMentorConflict,
  mentorConflictErrors,
  type MentorConflict,
} from './mentorFailures';
import { MIN_FILL_MS } from './SubmitRegistration';

const DEFAULT_META: MentorSubmissionMeta = { honeypot: '', elapsedMs: 0 };

// versão do aviso de privacidade dos mentores (/privacidade, seção "Mentores") que o checkbox aceita; mudou o
// texto dessa seção, suba a versão. Mantenha igual ao MENTOR_CONSENT_VERSION do apps-script/Mentors.gs (um teste confere)
export const MENTOR_CONSENT_VERSION = '2026-10-m1';

// conflict = e-mail ou WhatsApp que já têm cadastro: o erro vai no campo
export type SubmitMentorResult =
  | { status: 'invalid'; errors: MentorErrors }
  | { status: 'conflict'; reason: MentorConflict; errors: MentorErrors; message: string }
  | { status: 'success'; protocol: string }
  | { status: 'failed'; reason: GatewayFailure; message: string; retryable: boolean };

export interface SubmitMentorDeps {
  gateway: MentorRegistrationGateway;
  clock: Clock;
  consentVersion?: string;
  sleep?: Sleep;
}

// caso de uso do cadastro de mentor: valida no domínio, espera o tempo mínimo de preenchimento (o filtro de robô
// do servidor) e grava pelo gateway. Cadastro sem prazo nem vagas: quem fecha é o servidor
export class SubmitMentorRegistration {
  private readonly gateway: MentorRegistrationGateway;
  private readonly clock: Clock;
  private readonly consentVersion: string;
  private readonly sleep: Sleep;

  constructor(deps: SubmitMentorDeps) {
    this.gateway = deps.gateway;
    this.clock = deps.clock;
    this.consentVersion = deps.consentVersion ?? MENTOR_CONSENT_VERSION;
    this.sleep = deps.sleep ?? wait;
  }

  // validação isolada pra feedback em tempo real no formulário
  validate(input: MentorInput): MentorErrors {
    const result = MentorRegistration.create(input);
    return result.ok ? {} : result.error;
  }

  async execute(input: MentorInput, meta: MentorSubmissionMeta = DEFAULT_META): Promise<SubmitMentorResult> {
    const result = MentorRegistration.create(input);
    if (!result.ok) return { status: 'invalid', errors: result.error };

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
      if (!(error instanceof RegistrationGatewayError)) return SubmitMentorRegistration.failure('network');
      return SubmitMentorRegistration.rejection(error);
    }
  }

  // conflito vira erro no campo; o resto vira a caixa de falha
  private static rejection(error: RegistrationGatewayError): SubmitMentorResult {
    if (!isMentorConflict(error.kind)) return SubmitMentorRegistration.failure(error.kind);
    return {
      status: 'conflict',
      reason: error.kind,
      errors: mentorConflictErrors(error.kind),
      message: MENTOR_FAILURE_MESSAGES[error.kind],
    };
  }

  private static failure(reason: GatewayFailure): SubmitMentorResult {
    return {
      status: 'failed',
      reason,
      message: MENTOR_FAILURE_MESSAGES[reason],
      retryable: RETRYABLE_FAILURES.has(reason),
    };
  }

  // só chega aqui com acceptedTerms = true (o domínio barra o resto), então o envio é o aceite
  private toPayload(registration: MentorRegistration, meta: MentorSubmissionMeta): MentorPayload {
    const now = this.clock.now().toISOString();
    return {
      mentor: { ...registration.data },
      submittedAt: now,
      source: meta.source ?? 'mentor-page',
      consentVersion: this.consentVersion,
      consentAt: now,
      honeypot: meta.honeypot,
      elapsedMs: Math.max(0, Math.round(meta.elapsedMs)),
      idempotencyKey: meta.idempotencyKey ?? '',
    };
  }
}
