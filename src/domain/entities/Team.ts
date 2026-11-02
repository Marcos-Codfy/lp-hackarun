import { Entity } from '../shared/Entity';
import type { TeamName } from '../value-objects/TeamName';

export type TeamStatus = 'confirmed' | 'pending';

// só https (Drive), data:image (simulação do dev) ou a arte local de um Pokémon (/pokemon/6.webp, logo do sorteio dos
// nomes): nada de javascript: ou http solto no src da foto
const SAFE_IMAGE_URL = /^(?:https:\/\/|data:image\/(?:png|jpeg|webp);base64,|\/pokemon\/\d{1,4}\.webp$)/;

// equipe pública: só o que o site mostra (nome, quantidade de integrantes e a foto). Nome de pessoa,
// matrícula e e-mail ficam na planilha
export interface TeamProps {
  id: string;
  name: TeamName;
  memberCount?: number;
  status: TeamStatus;
  // foto ou logo pública (só aparece depois da confirmação)
  imageUrl?: string | null;
}

export class Team extends Entity {
  readonly name: TeamName;
  readonly size: number;
  readonly status: TeamStatus;
  readonly imageUrl: string | null;

  private constructor(props: TeamProps) {
    super(props.id);
    this.name = props.name;
    const count = props.memberCount ?? 0;
    this.size = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
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
