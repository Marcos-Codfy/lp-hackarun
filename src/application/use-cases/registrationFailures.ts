import type { RegistrationErrors } from '@domain/index';
import type { ConflictFailure, GatewayFailure } from '../ports/RegistrationGateway';

// passageiras: vale tentar de novo com os mesmos dados
export const RETRYABLE_FAILURES: ReadonlySet<GatewayFailure> = new Set(['network', 'server', 'rate-limited']);

export const FAILURE_MESSAGES: Record<GatewayFailure, string> = {
  network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
  server: 'O servidor das inscrições falhou por um instante. Seus dados continuam aqui: tente de novo.',
  rejected: 'A inscrição foi recusada. Revise os dados e tente novamente.',
  closed: 'As inscrições estão encerradas.',
  duplicate: 'Essa inscrição já foi registrada.',
  'rate-limited': 'Muita gente se inscrevendo agora. Tente de novo em alguns segundos.',
  'duplicate-email': 'Esse e-mail já tem uma inscrição. Cada pessoa se inscreve uma vez só.',
  'duplicate-whatsapp': 'Esse WhatsApp já tem uma inscrição. Cada pessoa se inscreve uma vez só.',
  'duplicate-student-id': 'Essa matrícula já tem uma inscrição. Cada pessoa se inscreve uma vez só.',
};

// conflito -> campo do formulário onde o erro aparece
const CONFLICT_FIELDS: Record<ConflictFailure, [string, string]> = {
  'duplicate-email': ['email', 'Esse e-mail já tem uma inscrição.'],
  'duplicate-whatsapp': ['whatsapp', 'Esse WhatsApp já tem uma inscrição.'],
  'duplicate-student-id': ['studentId', 'Essa matrícula já tem uma inscrição.'],
};

export const isConflict = (kind: GatewayFailure): kind is ConflictFailure =>
  Object.prototype.hasOwnProperty.call(CONFLICT_FIELDS, kind);

export function conflictErrors(kind: ConflictFailure): RegistrationErrors {
  const [field, message] = CONFLICT_FIELDS[kind];
  return { [field]: message };
}
