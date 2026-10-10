import { DomainError } from '@domain/index';
import type { EventRepository, Venue } from '@domain/index';
import type { EventDayDTO } from '../dto';
import { toEventDayDTO } from './mappers';

export class GetSchedule {
  private readonly events: EventRepository;

  constructor(events: EventRepository) {
    this.events = events;
  }

  async execute(): Promise<EventDayDTO[]> {
    const event = await this.events.get();
    const venueOf = (id: string): Venue => {
      const venue = event.venue(id);
      if (!venue) throw new DomainError(`Unknown venue "${id}"`);
      return venue;
    };
    return event.days.map((d) => toEventDayDTO(d, venueOf));
  }
}
