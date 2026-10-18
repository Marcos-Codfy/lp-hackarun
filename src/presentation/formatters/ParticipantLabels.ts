import { PARTICIPANT_PROFILES, PERIOD_RANGE, TECH_AREAS } from '@domain/index';
import type { ParticipantProfile, TechArea } from '@domain/index';

// textos das opções do formulário de inscrição (o domínio guarda só os códigos)
export const PROFILE_LABELS: Record<ParticipantProfile, { label: string; detail: string }> = {
  unicatolica: { label: 'Sim, estudo na UniCatólica', detail: 'Graduação ou curso técnico.' },
  'other-institution': { label: 'Sim, estudo em outra instituição', detail: 'Graduação ou curso técnico.' },
  graduate: { label: 'Não, já me formei', detail: 'Já concluí a graduação ou o técnico.' },
  'self-taught': {
    label: 'Não estudo, mas trabalho ou estudo tecnologia por conta própria',
    detail: 'Profissional da área ou entusiasta de tecnologia.',
  },
};

export const AREA_LABELS: Record<TechArea, string> = {
  development: 'Desenvolvimento',
  'data-ai': 'Dados e IA',
  design: 'Design e UX',
  infra: 'Redes e infraestrutura',
  security: 'Segurança',
  product: 'Produto e gestão',
  other: 'Outra',
};

export const PROFILE_OPTIONS = PARTICIPANT_PROFILES.map((value) => ({ value, ...PROFILE_LABELS[value] }));

export const AREA_OPTIONS = TECH_AREAS.map((value) => ({ value, label: AREA_LABELS[value] }));

export const PERIOD_OPTIONS = Array.from({ length: PERIOD_RANGE.max - PERIOD_RANGE.min + 1 }, (_, i) => {
  const period = PERIOD_RANGE.min + i;
  return { value: String(period), label: `${period}º período` };
});

export const ADULT_OPTIONS = [
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Não' },
] as const;

// sugestões do campo Curso (datalist): a pessoa pode digitar outro
export const COURSE_SUGGESTIONS: readonly string[] = [
  'Engenharia de Software',
  'Inteligência Artificial',
  'Ciência da Computação',
  'Sistemas de Informação',
  'Análise e Desenvolvimento de Sistemas',
  'Engenharia da Computação',
  'Redes de Computadores',
];
