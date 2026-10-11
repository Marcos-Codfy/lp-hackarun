import type { RegistrationMode } from '@domain/index';

export interface RegistrationPayload {
  mode: RegistrationMode;
  teamName: string | null;
  leader: { name: string; email: string; phone: string; course: string; semester: string };
  members: { name: string; email: string; course: string }[];
  accessibilityNeeds: string;
  submittedAt: string;
  source: string;
  // prova do consentimento (LGPD): versão do aviso aceito e quando; vira a coluna Consentimento
  consentVersion: string;
  consentAt: string;
  // anti-spam: honeypot preenchido ou envio rápido demais = robô (o servidor decide)
  honeypot: string;
  elapsedMs: number;
}

// metadados do envio que não fazem parte da inscrição em si
export interface SubmissionMeta {
  honeypot: string;
  elapsedMs: number;
  source?: string;
}

export interface RegistrationReceipt {
  protocol: string;
}

export type GatewayFailure = 'network' | 'rejected' | 'closed' | 'duplicate' | 'rate-limited';

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
