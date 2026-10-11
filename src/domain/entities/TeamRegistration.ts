import { TeamName } from '../value-objects/TeamName';
import { Email, PersonName, Phone } from '../value-objects/ContactFields';
import { fail, ok, type Result } from '../shared/Result';
import { DomainError } from '../shared/DomainError';

export type RegistrationMode = 'team' | 'solo';

export interface ParticipantInput {
  name: string;
  email: string;
  course: string;
}

export interface RegistrationInput {
  mode: RegistrationMode;
  teamName: string;
  leader: ParticipantInput & { phone: string; semester: string };
  members: ParticipantInput[];
  accessibilityNeeds: string;
  acceptedTerms: boolean;
}

// chave = caminho do campo no formulário (ex.: "members.1.email")
export type RegistrationErrors = Record<string, string>;

export interface Participant {
  name: string;
  email: string;
  course: string;
}

export interface TeamSizeRule {
  min: number;
  max: number;
}

// aggregate da inscrição: concentra todas as regras do formulário
export class TeamRegistration {
  readonly mode: RegistrationMode;
  readonly teamName: string | null;
  readonly leader: Participant & { phone: string; semester: string };
  readonly members: readonly Participant[];
  readonly accessibilityNeeds: string;

  private constructor(props: Omit<TeamRegistration, 'size'>) {
    this.mode = props.mode;
    this.teamName = props.teamName;
    this.leader = props.leader;
    this.members = props.members;
    this.accessibilityNeeds = props.accessibilityNeeds;
  }

  get size(): number {
    return 1 + this.members.length;
  }

  static create(input: RegistrationInput, rule: TeamSizeRule): Result<TeamRegistration, RegistrationErrors> {
    if (rule.min < 1 || rule.max < rule.min) throw new DomainError('Invalid team size rule');
    const errors: RegistrationErrors = {};
    const pick = <T>(path: string, result: Result<T, string>): T | null => {
      if (result.ok) return result.value;
      errors[path] = result.error;
      return null;
    };

    const isTeam = input.mode === 'team';
    const teamName = isTeam ? (pick('teamName', TeamName.create(input.teamName))?.value ?? null) : null;

    const leaderName = pick('leader.name', PersonName.create(input.leader.name));
    const leaderEmail = pick('leader.email', Email.create(input.leader.email));
    const leaderPhone = pick('leader.phone', Phone.create(input.leader.phone));
    if (!input.leader.course.trim()) errors['leader.course'] = 'Informe o curso.';

    const members = isTeam ? input.members.filter((m) => m.name.trim() || m.email.trim()) : [];
    const parsedMembers: Participant[] = members.map((m, i) => {
      const name = pick(`members.${i}.name`, PersonName.create(m.name));
      const email = pick(`members.${i}.email`, Email.create(m.email));
      return { name: name?.value ?? '', email: email?.value ?? '', course: m.course.trim() };
    });

    if (isTeam) {
      const size = 1 + parsedMembers.length;
      if (size < rule.min)
        errors['members'] = `A equipe precisa de pelo menos ${rule.min} pessoas (contando você).`;
      if (size > rule.max) errors['members'] = `A equipe pode ter no máximo ${rule.max} pessoas.`;
      const emails = [leaderEmail?.value, ...parsedMembers.map((m) => m.email)].filter(Boolean);
      if (new Set(emails).size !== emails.length) errors['members'] = 'Tem e-mail repetido na equipe.';
    }

    if (!input.acceptedTerms) errors['acceptedTerms'] = 'É preciso aceitar o regulamento e o uso dos dados.';

    if (Object.keys(errors).length > 0) return fail(errors);

    return ok(
      new TeamRegistration({
        mode: input.mode,
        teamName,
        leader: {
          name: (leaderName as PersonName).value,
          email: (leaderEmail as Email).value,
          phone: (leaderPhone as Phone).formatted,
          course: input.leader.course.trim(),
          semester: input.leader.semester.trim(),
        },
        members: parsedMembers,
        accessibilityNeeds: input.accessibilityNeeds.trim().slice(0, 500),
      }),
    );
  }
}
