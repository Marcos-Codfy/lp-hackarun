import { DomainError } from '../shared/DomainError';

// para quem é cada bloco da programação:
// open = aberto ao público · hackathon = parte da competição · teams = só equipes e mentores · final = final com público
export type Audience = 'open' | 'hackathon' | 'teams' | 'final';

export const AUDIENCES: readonly Audience[] = ['open', 'hackathon', 'teams', 'final'];

// o JSON chega como string: valor fora da lista quebra o build
export function toAudience(value: string, field: string): Audience {
  const audience = AUDIENCES.find((a) => a === value);
  if (!audience) throw new DomainError(`${field}: unknown audience "${value}"`);
  return audience;
}
