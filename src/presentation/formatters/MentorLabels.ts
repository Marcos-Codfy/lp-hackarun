import type { MentorArea, MentorDay, MentorExperience, MentorFormat, MentorMode } from '@domain/index';

// opções do formulário de mentor, em pt-BR (os mesmos rótulos que o Mentors.gs grava na planilha)
export interface Option<T extends string> {
  value: T;
  label: string;
  detail?: string;
}

export const MENTOR_AREA_OPTIONS: readonly Option<MentorArea>[] = [
  { value: 'development', label: 'Desenvolvimento' },
  { value: 'data-ai', label: 'Dados e IA' },
  { value: 'infra', label: 'Redes e infraestrutura' },
  { value: 'security', label: 'Cibersegurança' },
  { value: 'tech-lead', label: 'Liderança técnica (tech lead)' },
  { value: 'design', label: 'Design e UX' },
  { value: 'product', label: 'Produto e gestão' },
  { value: 'quality', label: 'Qualidade e testes' },
  { value: 'other', label: 'Outra' },
];

export const MENTOR_EXPERIENCE_OPTIONS: readonly Option<MentorExperience>[] = [
  { value: 'up-to-2', label: 'Até 2 anos' },
  { value: '2-to-5', label: 'De 2 a 5 anos' },
  { value: '5-to-10', label: 'De 5 a 10 anos' },
  { value: 'over-10', label: 'Mais de 10 anos' },
];

export const MENTOR_FORMAT_OPTIONS: readonly Option<MentorFormat>[] = [
  { value: 'in-person', label: 'Presencial', detail: 'Na UniCatólica e no Capim Dourado Shopping' },
  { value: 'online', label: 'Online' },
  { value: 'either', label: 'Presencial ou online' },
];

export const MENTOR_MODE_OPTIONS: readonly Option<MentorMode>[] = [
  { value: 'one-team', label: 'Acompanhar uma equipe', detail: 'Fico com uma equipe durante o evento' },
  { value: 'on-demand', label: 'Atender sob demanda', detail: 'Ajudo as equipes que pedirem' },
  { value: 'either', label: 'Qualquer um dos dois' },
];

export const MENTOR_DAY_OPTIONS: readonly Option<MentorDay>[] = [
  { value: '11', label: '11/11 · quarta', detail: 'Oficinas' },
  { value: '12', label: '12/11 · quinta', detail: 'Abertura e sorteio das equipes' },
  { value: '13', label: '13/11 · sexta', detail: 'Desenvolvimento' },
  { value: '14', label: '14/11 · sábado', detail: 'Grande final' },
  { value: 'tbd', label: 'A combinar', detail: 'Ainda não sei os dias' },
];

export const GRADUATE_OPTIONS: readonly Option<'yes' | 'no'>[] = [
  { value: 'yes', label: 'Sim, sou egresso(a)' },
  { value: 'no', label: 'Não' },
];
