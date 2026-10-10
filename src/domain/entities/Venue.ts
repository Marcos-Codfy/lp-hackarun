import { Entity } from '../shared/Entity';
import { assertNonEmpty } from '../shared/guards';

export type VenueRole = 'host' | 'final';

export interface VenueProps {
  id: string;
  name: string;
  shortName: string;
  city: string;
  role: VenueRole;
  mapUrl: string | null;
}

export class Venue extends Entity {
  readonly name: string;
  readonly shortName: string;
  readonly city: string;
  readonly role: VenueRole;
  readonly mapUrl: string | null;

  private constructor(props: VenueProps) {
    super(props.id);
    this.name = assertNonEmpty(props.name, 'Venue.name');
    this.shortName = assertNonEmpty(props.shortName, 'Venue.shortName');
    this.city = props.city;
    this.role = props.role;
    this.mapUrl = props.mapUrl;
  }

  static create(props: VenueProps): Venue {
    return new Venue(props);
  }
}
