// quem se cadastra como mentor: área de atuação, experiência, disponibilidade e como prefere atuar.
// As listas são o contrato com o formulário e com o apps-script/Mentors.gs (um teste confere)

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

// tempo de atuação na área (ajuda a combinar mentor e equipe)
export const MENTOR_EXPERIENCE = ['up-to-2', '2-to-5', '5-to-10', 'over-10'] as const;
export type MentorExperience = (typeof MENTOR_EXPERIENCE)[number];

export const MENTOR_FORMATS = ['in-person', 'online', 'either'] as const;
export type MentorFormat = (typeof MENTOR_FORMATS)[number];

// como a pessoa prefere atuar: a dinâmica da mentoria ainda será definida (uma equipe fixa ou atendimento sob
// demanda), então a pergunta serve às duas
export const MENTOR_MODES = ['one-team', 'on-demand', 'either'] as const;
export type MentorMode = (typeof MENTOR_MODES)[number];

// dias do evento (11 a 14/11); "tbd" = a combinar
export const MENTOR_DAYS = ['11', '12', '13', '14', 'tbd'] as const;
export type MentorDay = (typeof MENTOR_DAYS)[number];

// ano de formatura de quem é egresso da UniCatólica
export const GRADUATION_YEAR_RANGE = { min: 1995, max: 2030 } as const;

const includes = (list: readonly string[], value: string): boolean => list.includes(value);

export const isMentorArea = (value: string): value is MentorArea => includes(MENTOR_AREAS, value);
export const isMentorExperience = (value: string): value is MentorExperience =>
  includes(MENTOR_EXPERIENCE, value);
export const isMentorFormat = (value: string): value is MentorFormat => includes(MENTOR_FORMATS, value);
export const isMentorMode = (value: string): value is MentorMode => includes(MENTOR_MODES, value);
export const isMentorDay = (value: string): value is MentorDay => includes(MENTOR_DAYS, value);
