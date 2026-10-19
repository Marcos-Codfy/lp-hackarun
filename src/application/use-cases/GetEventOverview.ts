import type { EventRepository, StationRepository, RegistrationPolicy } from '@domain/index';
import type { Clock } from '../ports/Clock';
import type { EventOverviewDTO } from '../dto';
import { toMilestoneDTO, toRegistrationDTO, toVenueDTO } from './mappers';

export class GetEventOverview {
  private readonly events: EventRepository;
  private readonly stations: StationRepository;
  private readonly policy: RegistrationPolicy;
  private readonly clock: Clock;

  constructor(deps: {
    events: EventRepository;
    stations: StationRepository;
    policy: RegistrationPolicy;
    clock: Clock;
  }) {
    this.events = deps.events;
    this.stations = deps.stations;
    this.policy = deps.policy;
    this.clock = deps.clock;
  }

  async execute(): Promise<EventOverviewDTO> {
    const [event, stations] = await Promise.all([this.events.get(), this.stations.list()]);

    // no build não dá pra saber quantos já se inscreveram: a página conta pela planilha (RegistrationCounter)
    const { registration } = event;
    const status = this.policy.statusAt(this.clock.now(), registration);

    const workshops = event.days.flatMap((d) => d.sessions).reduce((acc, s) => acc + s.workshopCount, 0);

    return {
      name: event.name,
      edition: event.edition,
      tagline: event.tagline,
      city: event.city,
      timezone: event.timezone,
      firstDate: event.firstDay.date,
      lastDate: event.lastDay.date,
      venues: event.venues.map(toVenueDTO),
      milestones: event.milestones.map(toMilestoneDTO),
      registration: toRegistrationDTO(registration, status),
      stats: { days: event.days.length, stations: stations.length, workshops, stands: event.maxStands },
    };
  }
}
