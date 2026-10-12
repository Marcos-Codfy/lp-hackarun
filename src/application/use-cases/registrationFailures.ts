import type { RegistrationErrors } from '@domain/index';
import type { ConflictFailure, GatewayFailure } from '../ports/RegistrationGateway';

// passageiras: vale tentar de novo com os mesmos dados
export const RETRYABLE_FAILURES: ReadonlySet<GatewayFailure> = new Set(['network', 'server', 'rate-limited']);

export const FAILURE_MESSAGES: Record<GatewayFailure, string> = {
  network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
  server: 'O servidor das inscrições falhou por um instante. Seus dados continuam aqui: tente de novo.',
  rejected: 'A inscrição foi recusada. Revise os dados e tente novamente.',
  closed: 'As inscrições estão encerradas.',
  duplicate: 'Essa equipe já tem uma inscrição registrada.',
  'rate-limited': 'Muita gente se inscrevendo agora. Tenta de novo em alguns segundos.',
  'duplicate-team-name': 'Já existe uma equipe inscrita com esse nome. Escolha outro.',
  'duplicate-email':
    'Um dos e-mails já está em outra equipe inscrita. Cada pessoa participa de uma equipe só.',
  'duplicate-student-id':
    'Uma das matrículas já está em outra equipe inscrita. Cada pessoa participa de uma equipe só.',
};

const CONFLICT_FIELDS: Record<Exclude<ConflictFailure, 'duplicate-team-name'>, [string, string]> = {
  'duplicate-email': ['email', 'Esse e-mail já está em outra equipe inscrita.'],
  'duplicate-student-id': ['studentId', 'Essa matrícula já está em outra equipe inscrita.'],
};

export const isConflict = (kind: GatewayFailure): kind is ConflictFailure =>
  kind === 'duplicate-team-name' || kind === 'duplicate-email' || kind === 'duplicate-student-id';

// conflito -> erro no campo certo; sem saber qual integrante (servidor antigo), devolve {} e vale a mensagem geral
export function conflictErrors(
  kind: ConflictFailure,
  memberIndexes: readonly number[],
  memberCount: number,
): RegistrationErrors {
  if (kind === 'duplicate-team-name') {
    return { teamName: 'Esse nome já é de outra equipe inscrita. Escolha outro.' };
  }
  const [field, message] = CONFLICT_FIELDS[kind];
  const valid = memberIndexes.filter((i) => Number.isInteger(i) && i >= 0 && i < memberCount);
  return Object.fromEntries(valid.map((i) => [`members.${i}.${field}`, message]));
}
