import type { ParticipantData } from '@domain/index';

export interface RegistrationPayload {
  // uma pessoa por envio (as equipes saem do sorteio); campos que não valem pro perfil vão vazios
  participant: ParticipantData;
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

// já tem inscrição com esse e-mail, WhatsApp ou matrícula
export type ConflictFailure = 'duplicate-email' | 'duplicate-whatsapp' | 'duplicate-student-id';

// server = o Apps Script quebrou no meio (planilha, cota): passageiro, diferente de "recusada"
export type GatewayFailure =
  'network' | 'server' | 'rejected' | 'closed' | 'duplicate' | 'rate-limited' | ConflictFailure;

export class RegistrationGatewayError extends Error {
  readonly kind: GatewayFailure;

  constructor(kind: GatewayFailure, message: string) {
    super(message);
    this.name = 'RegistrationGatewayError';
    this.kind = kind;
  }
}

// porta de saída: quem grava a inscrição (Apps Script, memória nos testes...)
export interface RegistrationGateway {
  submit(payload: RegistrationPayload): Promise<RegistrationReceipt>;
}
