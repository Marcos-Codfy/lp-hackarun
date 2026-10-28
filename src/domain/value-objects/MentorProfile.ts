// quem se cadastra como mentor: área de atuação e os dias do evento em que pode acompanhar as equipes
// (sempre presencial). As listas são o contrato com o formulário e com o apps-script/Mentors.gs (um teste confere)

// área de atuação (a lista do formulário; "tech-lead" e "quality" vieram do pedido da coordenação)
export const MENTOR_AREAS = [
  'development',
  'data-ai',
  'infra',
  'security',
  'tech-lead',
  'design',
  'product',
  'quality',
  'other',
] as const;
export type MentorArea = (typeof MENTOR_AREAS)[number];

// dias do evento em que há mentoria (12 a 14/11: abertura e sorteio, desenvolvimento e entrega final); o dia 11/11 é
// só de oficinas, antes de as equipes existirem
export const MENTOR_DAYS = ['12', '13', '14'] as const;
export type MentorDay = (typeof MENTOR_DAYS)[number];

// ano de formatura de quem é egresso da UniCatólica
export const GRADUATION_YEAR_RANGE = { min: 1995, max: 2030 } as const;

const includes = (list: readonly string[], value: string): boolean => list.includes(value);

export const isMentorArea = (value: string): value is MentorArea => includes(MENTOR_AREAS, value);
export const isMentorDay = (value: string): value is MentorDay => includes(MENTOR_DAYS, value);
