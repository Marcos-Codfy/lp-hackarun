import { Email } from '../value-objects/Email';
import { FullName } from '../value-objects/FullName';
import { Phone } from '../value-objects/Phone';
import { ShortText } from '../value-objects/ShortText';
import { StudentId } from '../value-objects/StudentId';
import {
  PERIOD_RANGE,
  isParticipantProfile,
  isStudying,
  isTechArea,
  needsArea,
  type ParticipantProfile,
  type TechArea,
} from '../value-objects/ParticipantProfile';
import { fail, ok, type Result } from '../shared/Result';

// inscrição individual (as equipes saem do sorteio de 12/11). Tudo chega como texto do formulário
export interface ParticipantInput {
  name: string;
  email: string;
  whatsapp: string;
  // '' = ainda não escolheu
  profile: ParticipantProfile | '';
  // só pra quem estuda fora da UniCatólica; opcional
  institution: string;
  // curso atual (quem estuda) ou curso em que se formou
  course: string;
  // "1" a "10"; só pra quem estuda
  period: string;
  // matrícula da UniCatólica; opcional
  studentId: string;
  area: TechArea | '';
  // tem 18 anos ou mais? '' = não respondeu
  adult: 'yes' | 'no' | '';
  acceptedTerms: boolean;
}

// chave = campo do formulário ("whatsapp", "course"...)
export type RegistrationErrors = Record<string, string>;

// o que vai pra planilha: campos que não valem pro perfil saem vazios (period 0 = não se aplica)
export interface ParticipantData {
  name: string;
  email: string;
  whatsapp: string;
  profile: ParticipantProfile;
  institution: string;
  course: string;
  period: number;
  studentId: string;
  area: TechArea | '';
  adult: boolean;
}

// mantenha iguais ao COURSE_LIMITS/INSTITUTION_LIMITS do apps-script/Validation.gs (um teste confere)
export const COURSE_RULE = { label: 'o curso', min: 3, max: 80 } as const;
export const INSTITUTION_RULE = { label: 'a instituição', min: 2, max: 100 } as const;

const COURSE_ERROR: Record<ParticipantProfile, string> = {
  unicatolica: 'Informe o curso que você faz.',
  'other-institution': 'Informe o curso que você faz.',
  graduate: 'Informe o curso em que você se formou.',
  'self-taught': '',
};

function parsePeriod(raw: string): number | null {
  const period = Number(raw.trim());
  return Number.isInteger(period) && period >= PERIOD_RANGE.min && period <= PERIOD_RANGE.max ? period : null;
}

// aggregate da inscrição: as regras de cada campo e as que dependem do perfil
export class ParticipantRegistration {
  readonly data: Readonly<ParticipantData>;

  private constructor(data: ParticipantData) {
    this.data = Object.freeze(data);
  }

  get email(): string {
    return this.data.email;
  }

  // menor de 18 precisa levar a autorização do responsável no credenciamento (regulamento, 2.5)
  get needsGuardianConsent(): boolean {
    return !this.data.adult;
  }

  static create(input: ParticipantInput): Result<ParticipantRegistration, RegistrationErrors> {
    const errors: RegistrationErrors = {};
    const take = <T>(field: string, result: Result<T, string>): T | null => {
      if (result.ok) return result.value;
      errors[field] = result.error;
      return null;
    };
    const name = take('name', FullName.create(input.name));
    const email = take('email', Email.create(input.email));
    const whatsapp = take('whatsapp', Phone.create(input.whatsapp));
    const profile = isParticipantProfile(input.profile) ? input.profile : null;
    if (!profile) errors['profile'] = 'Escolha a opção que mais combina com você.';
    if (input.adult !== 'yes' && input.adult !== 'no')
      errors['adult'] = 'Responda se você tem 18 anos ou mais.';
    if (!input.acceptedTerms)
      errors['acceptedTerms'] = 'É preciso concordar com o regulamento e o uso dos dados.';

    const details = profile ? ParticipantRegistration.details(profile, input, errors) : null;
    if (Object.keys(errors).length > 0 || !name || !email || !whatsapp || !profile || !details) {
      return fail(errors);
    }
    return ok(
      new ParticipantRegistration({
        name: name.value,
        email: email.value,
        whatsapp: whatsapp.value,
        profile,
        ...details,
        adult: input.adult === 'yes',
      }),
    );
  }

  // campos que dependem do perfil; os que não valem pra ele são ignorados (a pessoa pode ter trocado de opção)
  private static details(
    profile: ParticipantProfile,
    input: ParticipantInput,
    errors: RegistrationErrors,
  ): Pick<ParticipantData, 'institution' | 'course' | 'period' | 'studentId' | 'area'> | null {
    const out = { institution: '', course: '', period: 0, studentId: '', area: '' as TechArea | '' };
    if (profile !== 'self-taught') {
      const course = ShortText.create(input.course, COURSE_RULE);
      if (course.ok) out.course = course.value.value;
      else errors['course'] = ShortText.normalize(input.course) ? course.error : COURSE_ERROR[profile];
    }
    if (isStudying(profile)) {
      const period = parsePeriod(input.period);
      if (period === null) errors['period'] = 'Escolha o período que você está cursando.';
      else out.period = period;
    }
    if (profile === 'other-institution' && ShortText.normalize(input.institution)) {
      const institution = ShortText.create(input.institution, INSTITUTION_RULE);
      if (institution.ok) out.institution = institution.value.value;
      else errors['institution'] = institution.error;
    }
    if (profile === 'unicatolica') {
      out.institution = 'UniCatólica';
      if (StudentId.normalize(input.studentId)) {
        const studentId = StudentId.create(input.studentId);
        if (studentId.ok) out.studentId = studentId.value.value;
        else errors['studentId'] = studentId.error;
      }
    }
    if (needsArea(profile)) {
      if (isTechArea(input.area)) out.area = input.area;
      else errors['area'] = 'Escolha a área em que você atua ou que mais te interessa.';
    }
    return Object.keys(errors).length > 0 ? null : out;
  }
}
