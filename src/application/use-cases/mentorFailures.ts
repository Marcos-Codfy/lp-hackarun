import type { MentorErrors } from '@domain/index';
import type { GatewayFailure } from '../ports/RegistrationGateway';

// falhas que o cadastro de mentor conhece (a inscrição tem mais uma: matrícula repetida)
export type MentorConflict = 'duplicate-email' | 'duplicate-whatsapp';

export const MENTOR_FAILURE_MESSAGES: Record<GatewayFailure, string> = {
  network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
  server: 'O servidor do cadastro falhou por um instante. Seus dados continuam aqui: tente de novo.',
  rejected: 'O cadastro foi recusado. Revise os dados e tente novamente.',
  closed: 'O cadastro de mentores está encerrado.',
  duplicate: 'Esse cadastro já foi registrado.',
  'rate-limited': 'Muita gente se cadastrando agora. Tente de novo em alguns segundos.',
  'duplicate-email': 'Esse e-mail já está cadastrado como mentor. Cada pessoa se cadastra uma vez só.',
  'duplicate-whatsapp': 'Esse WhatsApp já está cadastrado como mentor. Cada pessoa se cadastra uma vez só.',
  'duplicate-student-id': 'Esse cadastro já foi registrado.',
};

// conflito -> campo do formulário onde o erro aparece
const CONFLICT_FIELDS: Record<MentorConflict, [string, string]> = {
  'duplicate-email': ['email', 'Esse e-mail já está cadastrado.'],
  'duplicate-whatsapp': ['whatsapp', 'Esse WhatsApp já está cadastrado.'],
};

export const isMentorConflict = (kind: GatewayFailure): kind is MentorConflict =>
  Object.prototype.hasOwnProperty.call(CONFLICT_FIELDS, kind);

export function mentorConflictErrors(kind: MentorConflict): MentorErrors {
  const [field, message] = CONFLICT_FIELDS[kind];
  return { [field]: message };
}
