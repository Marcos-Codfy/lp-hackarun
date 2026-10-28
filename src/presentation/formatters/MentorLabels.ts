import type { MentorArea, MentorDay } from '@domain/index';

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

export const MENTOR_DAY_OPTIONS: readonly Option<MentorDay>[] = [
  { value: '12', label: '12/11 · quinta' },
  { value: '13', label: '13/11 · sexta' },
  { value: '14', label: '14/11 · sábado' },
];

export const GRADUATE_OPTIONS: readonly Option<'yes' | 'no'>[] = [
  { value: 'yes', label: 'Sim, sou egresso(a)' },
  { value: 'no', label: 'Não' },
];
