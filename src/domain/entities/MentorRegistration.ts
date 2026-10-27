import { Email } from '../value-objects/Email';
import { FullName } from '../value-objects/FullName';
import { Phone } from '../value-objects/Phone';
import { ShortText, type ShortTextRule } from '../value-objects/ShortText';
import { ProfileLink } from '../value-objects/ProfileLink';
import {
  GRADUATION_YEAR_RANGE,
  MENTOR_DAYS,
  isMentorArea,
  isMentorDay,
  isMentorExperience,
  isMentorFormat,
  isMentorMode,
  type MentorArea,
  type MentorDay,
  type MentorExperience,
  type MentorFormat,
  type MentorMode,
} from '../value-objects/MentorProfile';
import { fail, ok, type Result } from '../shared/Result';

// cadastro de mentor (egressos e profissionais que ajudam as equipes no evento). Tudo chega como texto do
// formulário; a lista de dias chega como lista
export interface MentorInput {
  name: string;
  email: string;
  whatsapp: string;
  // '' = ainda não escolheu
  area: MentorArea | '';
  // tecnologias e temas que domina; opcional
  specialties: string;
  // cargo ou função atual
  role: string;
  company: string;
  experience: MentorExperience | '';
  // endereço do perfil (LinkedIn, GitHub, site); opcional
  linkedin: string;
  // é egresso da UniCatólica? '' = não respondeu
  graduate: 'yes' | 'no' | '';
  // curso e ano de formatura: só pra egresso
  course: string;
  graduationYear: string;
  days: readonly string[];
  format: MentorFormat | '';
  mode: MentorMode | '';
  notes: string;
  // autoriza mostrar nome e cargo na seção de mentores do site (opcional, separado do aceite dos dados)
  mayPublish: boolean;
  acceptedTerms: boolean;
}

// chave = campo do formulário ("whatsapp", "days"...)
export type MentorErrors = Record<string, string>;

// o que vai pra planilha: campos que não valem (curso e ano de quem não é egresso) saem vazios (ano 0)
export interface MentorData {
  name: string;
  email: string;
  whatsapp: string;
  area: MentorArea;
  specialties: string;
  role: string;
  company: string;
  experience: MentorExperience;
  linkedin: string;
  graduate: boolean;
  course: string;
  graduationYear: number;
  days: MentorDay[];
  format: MentorFormat;
  mode: MentorMode;
  notes: string;
  mayPublish: boolean;
}

// mantenha iguais aos *_LIMITS do apps-script/Mentors.gs (um teste confere)
export const MENTOR_ROLE_RULE = { label: 'o cargo ou a função', min: 2, max: 80 } as const;
export const MENTOR_COMPANY_RULE = { label: 'a empresa', min: 2, max: 100 } as const;
export const MENTOR_SPECIALTIES_RULE = { label: 'as especialidades', min: 2, max: 120 } as const;
export const MENTOR_COURSE_RULE = { label: 'o curso', min: 3, max: 80 } as const;
export const MENTOR_NOTES_RULE = { label: 'a observação', min: 2, max: 300 } as const;

function parseYear(raw: string): number | null {
  const year = Number(raw.trim());
  return Number.isInteger(year) && year >= GRADUATION_YEAR_RANGE.min && year <= GRADUATION_YEAR_RANGE.max
    ? year
    : null;
}

// dias na ordem do evento, sem repetir e sem opção que não existe
export function cleanDays(raw: readonly string[]): MentorDay[] {
  const chosen = new Set(raw.filter(isMentorDay));
  return MENTOR_DAYS.filter((day) => chosen.has(day));
}

// aggregate do cadastro: as regras de cada campo e as que dependem de ser egresso
export class MentorRegistration {
  readonly data: Readonly<MentorData>;

  private constructor(data: MentorData) {
    this.data = Object.freeze(data);
  }

  get email(): string {
    return this.data.email;
  }

  static create(input: MentorInput): Result<MentorRegistration, MentorErrors> {
    const errors: MentorErrors = {};
    const take = <T>(field: string, result: Result<T, string>): T | null => {
      if (result.ok) return result.value;
      errors[field] = result.error;
      return null;
    };
    // campo de texto opcional: vazio sai vazio; preenchido passa pela regra
    const optional = (field: string, raw: string, rule: ShortTextRule): string => {
      if (!ShortText.normalize(raw)) return '';
      return take(field, ShortText.create(raw, rule))?.value ?? '';
    };

    const name = take('name', FullName.create(input.name));
    const email = take('email', Email.create(input.email));
    const whatsapp = take('whatsapp', Phone.create(input.whatsapp));
    const area = isMentorArea(input.area) ? input.area : null;
    if (!area) errors['area'] = 'Escolha a área em que você atua.';
    const role = take('role', ShortText.create(input.role, MENTOR_ROLE_RULE))?.value ?? '';
    const experience = isMentorExperience(input.experience) ? input.experience : null;
    if (!experience) errors['experience'] = 'Escolha há quanto tempo você atua na área.';
    const company = optional('company', input.company, MENTOR_COMPANY_RULE);
    const specialties = optional('specialties', input.specialties, MENTOR_SPECIALTIES_RULE);
    const notes = optional('notes', input.notes, MENTOR_NOTES_RULE);
    const linkedin = ProfileLink.normalize(input.linkedin)
      ? (take('linkedin', ProfileLink.create(input.linkedin))?.value ?? '')
      : '';

    if (input.graduate !== 'yes' && input.graduate !== 'no') {
      errors['graduate'] = 'Responda se você é egresso(a) da UniCatólica.';
    }
    let course = '';
    let graduationYear = 0;
    if (input.graduate === 'yes') {
      const courseResult = ShortText.create(input.course, MENTOR_COURSE_RULE);
      if (courseResult.ok) course = courseResult.value.value;
      else
        errors['course'] = ShortText.normalize(input.course)
          ? courseResult.error
          : 'Informe o curso em que você se formou.';
      const year = parseYear(input.graduationYear);
      if (year === null) errors['graduationYear'] = 'Informe o ano de formatura, com 4 dígitos.';
      else graduationYear = year;
    }

    const days = cleanDays(input.days);
    if (days.length === 0) errors['days'] = 'Escolha pelo menos um dia (ou "A combinar").';
    const format = isMentorFormat(input.format) ? input.format : null;
    if (!format) errors['format'] = 'Escolha como você pode participar.';
    const mode = isMentorMode(input.mode) ? input.mode : null;
    if (!mode) errors['mode'] = 'Escolha como você prefere atuar.';
    if (!input.acceptedTerms) errors['acceptedTerms'] = 'É preciso concordar com o uso dos dados.';

    const invalid = Object.keys(errors).length > 0;
    if (invalid || !name || !email || !whatsapp || !area || !experience || !format || !mode) {
      return fail(errors);
    }
    return ok(
      new MentorRegistration({
        name: name.value,
        email: email.value,
        whatsapp: whatsapp.value,
        area,
        specialties,
        role,
        company,
        experience,
        linkedin,
        graduate: input.graduate === 'yes',
        course,
        graduationYear,
        days,
        format,
        mode,
        notes,
        mayPublish: input.mayPublish,
      }),
    );
  }
}
