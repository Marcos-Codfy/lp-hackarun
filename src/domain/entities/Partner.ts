import { Entity } from '../shared/Entity';

export type PartnerRole = 'organizer' | 'partner' | 'supporter';

export interface PartnerProps {
  id: string;
  name: string;
  role: PartnerRole;
  url: string | null;
  logo: string | null;
}

export class Partner extends Entity {
  readonly name: string;
  readonly role: PartnerRole;
  readonly url: string | null;
  readonly logo: string | null;

  private constructor(props: PartnerProps) {
    super(props.id);
    this.name = props.name;
    this.role = props.role;
    this.url = props.url;
    this.logo = props.logo;
  }

  static create(props: PartnerProps): Partner {
    return new Partner(props);
  }
}
