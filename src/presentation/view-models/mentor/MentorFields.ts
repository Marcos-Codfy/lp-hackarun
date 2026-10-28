import { Phone, cleanDays, isMentorArea } from '@domain/index';
import type { MentorArea, MentorDay, MentorInput } from '@domain/index';

// o que a pessoa preencheu, como está nos campos (texto cru; o domínio limpa e valida)
export interface MentorFields {
  name: string;
  email: string;
  whatsapp: string;
  area: MentorArea | '';
  // qual é a área, quando a pessoa escolhe "Outra"
  areaOther: string;
  specialties: string;
  linkedin: string;
  graduate: 'yes' | 'no' | '';
  course: string;
  graduationYear: string;
  days: MentorDay[];
  mayPublish: boolean;
  acceptedTerms: boolean;
  honeypot: string;
}

// campos de valor de texto ou de uma opção; os dias (lista) e os dois checkboxes têm caminho próprio
export type MentorTextPath = Exclude<keyof MentorFields, 'days' | 'mayPublish' | 'acceptedTerms'>;
export type MentorFlagPath = 'mayPublish' | 'acceptedTerms';

export const TEXT_PATHS: readonly MentorTextPath[] = [
  'name',
  'email',
  'whatsapp',
  'area',
  'areaOther',
  'specialties',
  'linkedin',
  'graduate',
  'course',
  'graduationYear',
  'honeypot',
];

export const isTextPath = (path: string): path is MentorTextPath =>
  (TEXT_PATHS as readonly string[]).includes(path);

export function emptyFields(): MentorFields {
  return {
    name: '',
    email: '',
    whatsapp: '',
    area: '',
    areaOther: '',
    specialties: '',
    linkedin: '',
    graduate: '',
    course: '',
    graduationYear: '',
    days: [],
    mayPublish: false,
    acceptedTerms: false,
    honeypot: '',
  };
}

// opção fora da lista (DOM mexido) vira "não escolheu"
function choice(path: MentorTextPath, value: string): string {
  if (path === 'area') return isMentorArea(value) ? value : '';
  if (path === 'graduate') return value === 'yes' || value === 'no' ? value : '';
  return value;
}

// atualização imutável por campo
export function withValue(fields: MentorFields, path: MentorTextPath, value: string): MentorFields {
  return { ...fields, [path]: choice(path, value) };
}

// dias na ordem do evento, sem repetir e sem opção que não existe
export function withDays(fields: MentorFields, days: readonly string[]): MentorFields {
  return { ...fields, days: cleanDays(days) };
}

export function withFlag(fields: MentorFields, path: MentorFlagPath, value: boolean): MentorFields {
  return { ...fields, [path]: value };
}

// curso e ano de formatura só existem pra egresso, e "qual área" só pra quem escolheu "Outra" (os outros ficam
// escondidos e o domínio ignora)
export function isFieldVisible(fields: MentorFields, path: string): boolean {
  if (path === 'course' || path === 'graduationYear') return fields.graduate === 'yes';
  if (path === 'areaOther') return fields.area === 'other';
  return true;
}

// valor de um campo (as conferências do servidor comparam com ele); o WhatsApp compara só os dígitos
export function comparableValue(fields: MentorFields, path: string): string | null {
  if (path === 'email') return fields.email.trim().toLowerCase();
  if (path === 'whatsapp') return Phone.digitsOf(fields.whatsapp);
  return null;
}

export function toInput(f: MentorFields): MentorInput {
  return {
    name: f.name,
    email: f.email,
    whatsapp: f.whatsapp,
    area: f.area,
    areaOther: f.areaOther,
    specialties: f.specialties,
    linkedin: f.linkedin,
    graduate: f.graduate,
    course: f.course,
    graduationYear: f.graduationYear,
    days: f.days,
    mayPublish: f.mayPublish,
    acceptedTerms: f.acceptedTerms,
  };
}

// ordem visual dos campos: define o primeiro inválido e a ordem do resumo de erros
export const FIELD_ORDER: readonly string[] = [
  'name',
  'email',
  'whatsapp',
  'area',
  'areaOther',
  'specialties',
  'linkedin',
  'graduate',
  'course',
  'graduationYear',
  'days',
  'acceptedTerms',
];
