import { Entity } from '../shared/Entity';

// organizer = realização (quem promove), coorganizer = organização (quem toca o evento junto)
export type PartnerRole = 'organizer' | 'coorganizer' | 'partner' | 'supporter';

export interface PartnerProps {
  id: string;
  name: string;
  // nome por extenso quando o name é sigla (LAES); null quando o name já basta
  fullName: string | null;
  role: PartnerRole;
  url: string | null;
  logo: string | null;
}

export class Partner extends Entity {
  readonly name: string;
  readonly fullName: string | null;
  readonly role: PartnerRole;
  readonly url: string | null;
  readonly logo: string | null;

  private constructor(props: PartnerProps) {
    super(props.id);
    this.name = props.name;
    this.fullName = props.fullName;
    this.role = props.role;
    this.url = props.url;
    this.logo = props.logo;
  }

  static create(props: PartnerProps): Partner {
    return new Partner(props);
  }
}
