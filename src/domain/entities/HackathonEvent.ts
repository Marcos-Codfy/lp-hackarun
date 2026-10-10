import { Entity } from '../shared/Entity';
import { DomainError } from '../shared/DomainError';
import type { EventDay, EventStage } from './EventDay';
import type { Venue } from './Venue';
import type { Milestone } from '../value-objects/Milestone';
import type { RegistrationWindow } from '../value-objects/RegistrationWindow';

export interface HackathonEventProps {
  id: string;
  name: string;
  edition: string;
  tagline: string;
  city: string;
  timezone: string;
  venues: Venue[];
  days: EventDay[];
  milestones: Milestone[];
  registration: RegistrationWindow;
}

export type EventPhase = 'upcoming' | 'running' | 'awaiting-ceremony' | 'finished';

// aggregate root: dias, locais, marcos e inscrição só mudam por aqui
export class HackathonEvent extends Entity {
  readonly name: string;
  readonly edition: string;
  readonly tagline: string;
  readonly city: string;
  readonly timezone: string;
  readonly venues: readonly Venue[];
  readonly days: readonly EventDay[];
  readonly milestones: readonly Milestone[];
  readonly registration: RegistrationWindow;

  private constructor(props: HackathonEventProps) {
    super(props.id);
    if (props.days.length === 0) throw new DomainError('Event needs at least one day');
    this.ensureVenuesExist(props);
    this.name = props.name;
    this.edition = props.edition;
    this.tagline = props.tagline;
    this.city = props.city;
    this.timezone = props.timezone;
    this.venues = [...props.venues];
    this.days = [...props.days].sort((a, b) => a.date.localeCompare(b.date));
    this.milestones = [...props.milestones].sort((a, b) => a.at.getTime() - b.at.getTime());
    this.registration = props.registration;
  }

  static create(props: HackathonEventProps): HackathonEvent {
    return new HackathonEvent(props);
  }

  get firstDay(): EventDay {
    return this.days[0] as EventDay;
  }

  get lastDay(): EventDay {
    return this.days[this.days.length - 1] as EventDay;
  }

  venue(id: string): Venue | undefined {
    return this.venues.find((v) => v.id === id);
  }

  venueByRole(role: Venue['role']): Venue | undefined {
    return this.venues.find((v) => v.role === role);
  }

  dayByStage(stage: EventStage): EventDay | undefined {
    return this.days.find((d) => d.stage === stage);
  }

  nextMilestone(now: Date): Milestone | null {
    return this.milestones.find((m) => m.isAfter(now)) ?? null;
  }

  phaseAt(now: Date): EventPhase {
    const next = this.nextMilestone(now);
    if (!next) return 'finished';
    if (next.key === 'kickoff') return 'upcoming';
    if (next.key === 'submission') return 'running';
    return 'awaiting-ceremony';
  }

  private ensureVenuesExist(props: HackathonEventProps): void {
    const ids = new Set(props.venues.map((v) => v.id));
    for (const day of props.days) {
      for (const venueId of day.venueIds) {
        if (!ids.has(venueId)) throw new DomainError(`Unknown venue "${venueId}" on ${day.date}`);
      }
    }
  }
}
