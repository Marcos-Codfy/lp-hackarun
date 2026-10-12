import { Entity } from '../shared/Entity';
import type { TeamName } from '../value-objects/TeamName';

export type TeamStatus = 'confirmed' | 'pending';

// só https (Drive) ou data:image (simulação do dev): nada de javascript: ou http solto no src da foto
const SAFE_IMAGE_URL = /^(?:https:\/\/|data:image\/(?:png|jpeg|webp);base64,)/;

export interface TeamProps {
  id: string;
  name: TeamName;
  members: string[];
  // fonte pública (planilha) não expõe nomes, só a quantidade
  memberCount?: number;
  course: string | null;
  mentor: string | null;
  status: TeamStatus;
  // foto ou logo pública (só aparece depois da confirmação)
  imageUrl?: string | null;
}

export class Team extends Entity {
  readonly name: TeamName;
  readonly members: readonly string[];
  readonly size: number;
  readonly course: string | null;
  readonly mentor: string | null;
  readonly status: TeamStatus;
  readonly imageUrl: string | null;

  private constructor(props: TeamProps) {
    super(props.id);
    this.name = props.name;
    this.members = [...props.members];
    this.size = props.memberCount ?? props.members.length;
    this.course = props.course;
    this.mentor = props.mentor;
    this.status = props.status;
    this.imageUrl = props.imageUrl && SAFE_IMAGE_URL.test(props.imageUrl) ? props.imageUrl : null;
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
