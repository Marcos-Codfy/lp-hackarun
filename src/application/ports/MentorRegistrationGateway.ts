import type { MentorData } from '@domain/index';
import type { RegistrationReceipt } from './RegistrationGateway';

// cadastro de mentor: o que o site manda pro Apps Script (ação "register-mentor"). O protocolo volta no
// mesmo formato da inscrição (RegistrationReceipt), só com outro prefixo (MT26-)
export interface MentorPayload {
  mentor: MentorData;
  submittedAt: string;
  source: string;
  // prova do consentimento (LGPD): versão do aviso dos mentores e quando; vira a coluna Consentimento
  consentVersion: string;
  consentAt: string;
  // anti-spam: honeypot preenchido ou envio rápido demais = robô (o servidor decide)
  honeypot: string;
  elapsedMs: number;
  // a mesma em todo reenvio do formulário: o servidor devolve o protocolo já gravado em vez de duplicar
  idempotencyKey: string;
}

// metadados do envio que não fazem parte do cadastro em si
export interface MentorSubmissionMeta {
  honeypot: string;
  elapsedMs: number;
  source?: string;
  idempotencyKey?: string;
}

// porta de saída: quem grava o cadastro (Apps Script, memória nos testes...). As falhas são as mesmas da
// inscrição (RegistrationGatewayError): rede, servidor, recusado, encerrado, repetido, fila cheia
export interface MentorRegistrationGateway {
  submit(payload: MentorPayload): Promise<RegistrationReceipt>;
}
