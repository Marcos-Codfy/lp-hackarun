import type { ParticipantProfile } from '../value-objects/ParticipantProfile';

// nível de conhecimento de quem entra no sorteio das equipes: o período de quem estuda (1º ao 10º), quem já se formou
// e quem trabalha ou estuda por conta própria. É a chave da diversidade: cada equipe deve ter níveis diferentes
export type KnowledgeLevel = `p${number}` | 'graduate' | 'self-taught' | 'unknown';

// quem estuda entra pelo período; sem período informado (ou perfil sem faculdade) cai nos outros níveis
export function levelOf(profile: ParticipantProfile | null, period: number | null): KnowledgeLevel {
  if (profile === 'graduate') return 'graduate';
  if (profile === 'self-taught') return 'self-taught';
  if (period !== null && Number.isInteger(period) && period >= 1) return `p${period}`;
  return 'unknown';
}

// ordem de "experiência" (usada só para mostrar os níveis na ordem certa): períodos, formados, autodidatas
export function levelRank(level: KnowledgeLevel): number {
  if (level === 'graduate') return 100;
  if (level === 'self-taught') return 101;
  if (level === 'unknown') return 102;
  return Number(level.slice(1));
}

export function levelLabel(level: KnowledgeLevel): string {
  if (level === 'graduate') return 'Formado(a)';
  if (level === 'self-taught') return 'Por conta própria';
  if (level === 'unknown') return 'Sem período';
  return `${level.slice(1)}º período`;
}
