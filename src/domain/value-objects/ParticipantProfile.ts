// quem está se inscrevendo: o perfil decide quais campos de estudo ou de área são pedidos
export const PARTICIPANT_PROFILES = ['unicatolica', 'other-institution', 'graduate', 'self-taught'] as const;
export type ParticipantProfile = (typeof PARTICIPANT_PROFILES)[number];

// área em que a pessoa atua ou que mais interessa (ajuda a equilibrar as equipes no sorteio)
export const TECH_AREAS = [
  'development',
  'data-ai',
  'design',
  'infra',
  'security',
  'product',
  'other',
] as const;
export type TechArea = (typeof TECH_AREAS)[number];

// período da graduação ou módulo do técnico
export const PERIOD_RANGE = { min: 1, max: 10 } as const;

export const isParticipantProfile = (value: string): value is ParticipantProfile =>
  (PARTICIPANT_PROFILES as readonly string[]).includes(value);

export const isTechArea = (value: string): value is TechArea =>
  (TECH_AREAS as readonly string[]).includes(value);

// estuda agora: pede curso e período (a UniCatólica pede também a matrícula, opcional)
export const isStudying = (profile: ParticipantProfile): boolean =>
  profile === 'unicatolica' || profile === 'other-institution';

// já formado ou sem faculdade: pede a área
export const needsArea = (profile: ParticipantProfile): boolean =>
  profile === 'graduate' || profile === 'self-taught';
