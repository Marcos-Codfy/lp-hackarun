import type { MemberInput, TeamImageType } from '@domain/index';

export interface RegistrationPayload {
  teamName: string;
  // members[0] = contato da equipe; nome completo, matrícula e e-mail de cada um
  members: MemberInput[];
  // foto/logo da equipe em base64 (vai no mesmo POST text/plain, sem preflight)
  teamImage: { mimeType: TeamImageType; base64: string };
  submittedAt: string;
  source: string;
  // prova do consentimento (LGPD): versão do aviso aceito e quando; vira a coluna Consentimento
  consentVersion: string;
  consentAt: string;
  // anti-spam: honeypot preenchido ou envio rápido demais = robô (o servidor decide)
  honeypot: string;
  elapsedMs: number;
  // a mesma em todo reenvio do formulário: o servidor devolve o protocolo já gravado em vez de duplicar
  idempotencyKey: string;
}

// metadados do envio que não fazem parte da inscrição em si
export interface SubmissionMeta {
  honeypot: string;
  elapsedMs: number;
  source?: string;
  idempotencyKey?: string;
}

export interface RegistrationReceipt {
  protocol: string;
}

// já inscrito em outra equipe: nome da equipe, e-mail ou matrícula (o servidor diz qual integrante)
export type ConflictFailure = 'duplicate-team-name' | 'duplicate-email' | 'duplicate-student-id';

// server = o Apps Script quebrou no meio (planilha, cota): passageiro, diferente de "recusada"
export type GatewayFailure =
  'network' | 'server' | 'rejected' | 'closed' | 'duplicate' | 'rate-limited' | ConflictFailure;

export class RegistrationGatewayError extends Error {
  readonly kind: GatewayFailure;
  // posição (base 0) de cada integrante em conflito, na ordem do envio
  readonly memberIndexes: readonly number[];

  constructor(kind: GatewayFailure, message: string, memberIndexes: readonly number[] = []) {
    super(message);
    this.name = 'RegistrationGatewayError';
    this.kind = kind;
    this.memberIndexes = memberIndexes;
  }
}

// porta de saída: quem grava a inscrição (Apps Script, memória nos testes...)
export interface RegistrationGateway {
  submit(payload: RegistrationPayload): Promise<RegistrationReceipt>;
}
