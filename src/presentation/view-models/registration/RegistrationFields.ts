import { isParticipantProfile, isStudying, isTechArea, needsArea, Phone } from '@domain/index';
import type { ParticipantInput, ParticipantProfile, TechArea } from '@domain/index';

// o que a pessoa preencheu, como está nos campos (texto cru; o domínio limpa e valida)
export interface RegistrationFields {
  name: string;
  email: string;
  whatsapp: string;
  profile: ParticipantProfile | '';
  institution: string;
  course: string;
  period: string;
  studentId: string;
  area: TechArea | '';
  adult: 'yes' | 'no' | '';
  acceptedTerms: boolean;
  honeypot: string;
}

// campos de valor (texto, lista ou opção); o aceite é o checkbox à parte
export type FieldPath = Exclude<keyof RegistrationFields, 'acceptedTerms'>;

export const FIELD_PATHS: readonly FieldPath[] = [
  'name',
  'email',
  'whatsapp',
  'adult',
  'profile',
  'institution',
  'course',
  'period',
  'studentId',
  'area',
  'honeypot',
];

export const isFieldPath = (path: string): path is FieldPath =>
  (FIELD_PATHS as readonly string[]).includes(path);

export function emptyFields(): RegistrationFields {
  return {
    name: '',
    email: '',
    whatsapp: '',
    profile: '',
    institution: '',
    course: '',
    period: '',
    studentId: '',
    area: '',
    adult: '',
    acceptedTerms: false,
    honeypot: '',
  };
}

// opção fora da lista (rascunho velho, DOM mexido) vira "não escolheu"
function choice(path: FieldPath, value: string): string {
  if (path === 'profile') return isParticipantProfile(value) ? value : '';
  if (path === 'area') return isTechArea(value) ? value : '';
  if (path === 'adult') return value === 'yes' || value === 'no' ? value : '';
  return value;
}

// atualização imutável por campo
export function withValue(fields: RegistrationFields, path: FieldPath, value: string): RegistrationFields {
  return { ...fields, [path]: choice(path, value) };
}

// campos que aparecem pro perfil escolhido (os outros ficam escondidos e o domínio ignora)
export function visibleFields(profile: RegistrationFields['profile']): Set<FieldPath> {
  const visible = new Set<FieldPath>(['name', 'email', 'whatsapp', 'adult', 'profile']);
  if (!profile) return visible;
  if (profile !== 'self-taught') visible.add('course');
  if (isStudying(profile)) visible.add('period');
  if (profile === 'other-institution') visible.add('institution');
  if (profile === 'unicatolica') visible.add('studentId');
  if (needsArea(profile)) visible.add('area');
  return visible;
}

// valor de um campo (as conferências do servidor comparam com ele); o WhatsApp compara só os dígitos
export function comparableValue(fields: RegistrationFields, path: string): string | null {
  if (!isFieldPath(path)) return null;
  const value = fields[path];
  return path === 'whatsapp' ? Phone.digitsOf(value) : value.trim().toLowerCase();
}

export function toInput(f: RegistrationFields): ParticipantInput {
  return {
    name: f.name,
    email: f.email,
    whatsapp: f.whatsapp,
    profile: f.profile,
    institution: f.institution,
    course: f.course,
    period: f.period,
    studentId: f.studentId,
    area: f.area,
    adult: f.adult,
    acceptedTerms: f.acceptedTerms,
  };
}

// ordem visual dos campos: define o primeiro inválido e a ordem do resumo de erros
export const FIELD_ORDER: readonly string[] = [
  'name',
  'email',
  'whatsapp',
  'adult',
  'profile',
  'institution',
  'course',
  'period',
  'studentId',
  'area',
  'acceptedTerms',
];
