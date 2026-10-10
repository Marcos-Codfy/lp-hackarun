import { Entity } from '../shared/Entity';
import type { TeamName } from '../value-objects/TeamName';

export type TeamStatus = 'confirmed' | 'pending';

export interface TeamProps {
  id: string;
  name: TeamName;
  members: string[];
  course: string | null;
  mentor: string | null;
  status: TeamStatus;
}

export class Team extends Entity {
  readonly name: TeamName;
  readonly members: readonly string[];
  readonly course: string | null;
  readonly mentor: string | null;
  readonly status: TeamStatus;

  private constructor(props: TeamProps) {
    super(props.id);
    this.name = props.name;
    this.members = [...props.members];
    this.course = props.course;
    this.mentor = props.mentor;
    this.status = props.status;
  }

  static create(props: TeamProps): Team {
    return new Team(props);
  }

  get isConfirmed(): boolean {
    return this.status === 'confirmed';
  }

  matches(normalizedQuery: string): boolean {
    if (!normalizedQuery) return true;
    return this.name.searchKey.includes(normalizedQuery);
  }
}
