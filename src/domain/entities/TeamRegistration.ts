import { TeamName } from '../value-objects/TeamName';
import { StudentId } from '../value-objects/StudentId';
import { TeamMember, type MemberInput } from '../value-objects/TeamMember';
import { TeamImage, type TeamImageInput } from '../value-objects/TeamImage';
import { fail, ok, type Result } from '../shared/Result';
import { DomainError } from '../shared/DomainError';

// inscrição só de equipe: o integrante 1 é o contato (é pro e-mail dele que a organização escreve)
export interface RegistrationInput {
  teamName: string;
  members: MemberInput[];
  acceptedTerms: boolean;
  // foto ou logo já preparada no navegador; obrigatória
  teamImage?: TeamImageInput | null;
}

// chave = caminho do campo no formulário (ex.: "members.1.email")
export type RegistrationErrors = Record<string, string>;

export interface TeamSizeRule {
  min: number;
  max: number;
}

// e-mail ou matrícula que aparece de novo dentro da mesma equipe: o erro vai no campo repetido.
// Compara o valor normalizado de cada campo válido, mesmo que outro campo do integrante tenha erro
function flagRepeated(
  inputs: readonly MemberInput[],
  field: 'email' | 'studentId',
  message: (first: number) => string,
  errors: RegistrationErrors,
): void {
  const seen = new Map<string, number>();
  inputs.forEach((raw, i) => {
    const path = `members.${i}.${field}`;
    if (errors[path]) return;
    const value = field === 'email' ? raw.email.trim().toLowerCase() : StudentId.normalize(raw.studentId);
    const first = seen.get(value);
    if (first === undefined) seen.set(value, i);
    else errors[path] = message(first + 1);
  });
}

// aggregate da inscrição: concentra todas as regras do formulário
export class TeamRegistration {
  readonly teamName: string;
  readonly members: readonly TeamMember[];
  readonly teamImage: TeamImage;

  private constructor(teamName: string, members: readonly TeamMember[], teamImage: TeamImage) {
    this.teamName = teamName;
    this.members = members;
    this.teamImage = teamImage;
  }

  get size(): number {
    return this.members.length;
  }

  get contact(): TeamMember {
    return this.members[0] as TeamMember;
  }

  static create(input: RegistrationInput, rule: TeamSizeRule): Result<TeamRegistration, RegistrationErrors> {
    if (rule.min < 1 || rule.max < rule.min) throw new DomainError('Invalid team size rule');
    const errors: RegistrationErrors = {};
    const teamName = TeamName.create(input.teamName);
    if (!teamName.ok) errors['teamName'] = teamName.error;
    const teamImage = TeamImage.create(input.teamImage);
    if (!teamImage.ok) errors['teamImage'] = teamImage.error;

    const members = input.members.map((raw, i) => {
      const member = TeamMember.create(raw);
      if (member.ok) return member.value;
      for (const [field, message] of Object.entries(member.error)) errors[`members.${i}.${field}`] = message;
      return null;
    });
    flagRepeated(input.members, 'email', (n) => `Esse e-mail já está no integrante ${n}.`, errors);
    flagRepeated(input.members, 'studentId', (n) => `Essa matrícula já está no integrante ${n}.`, errors);
    if (members.length < rule.min)
      errors['members'] = `A equipe precisa de pelo menos ${rule.min} integrantes.`;
    if (members.length > rule.max) errors['members'] = `A equipe pode ter no máximo ${rule.max} integrantes.`;

    if (!input.acceptedTerms)
      errors['acceptedTerms'] = 'É preciso concordar com o regulamento e o uso dos dados.';

    if (Object.keys(errors).length > 0 || !teamName.ok || !teamImage.ok) return fail(errors);
    return ok(new TeamRegistration(teamName.value.value, members as TeamMember[], teamImage.value));
  }
}
