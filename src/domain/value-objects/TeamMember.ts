import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';
import { Email } from './Email';
import { FullName } from './FullName';
import { StudentId } from './StudentId';

export interface MemberInput {
  name: string;
  studentId: string;
  email: string;
}

export type MemberField = keyof MemberInput;
export type MemberErrors = Partial<Record<MemberField, string>>;

// integrante da equipe: os três campos são obrigatórios e cada um tem o seu erro
export class TeamMember extends ValueObject<MemberInput> {
  static create(input: MemberInput): Result<TeamMember, MemberErrors> {
    const name = FullName.create(input.name);
    const studentId = StudentId.create(input.studentId);
    const email = Email.create(input.email);
    if (name.ok && studentId.ok && email.ok) {
      return ok(
        new TeamMember({
          name: name.value.value,
          studentId: studentId.value.value,
          email: email.value.value,
        }),
      );
    }
    const errors: MemberErrors = {};
    if (!name.ok) errors.name = name.error;
    if (!studentId.ok) errors.studentId = studentId.error;
    if (!email.ok) errors.email = email.error;
    return fail(errors);
  }

  get name(): string {
    return this.props.name;
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get email(): string {
    return this.props.email;
  }

  toJSON(): MemberInput {
    return { name: this.name, studentId: this.studentId, email: this.email };
  }
}
