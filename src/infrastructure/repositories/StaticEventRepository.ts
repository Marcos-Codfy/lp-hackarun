import type { EventRepository, HackathonEvent } from '@domain/index';
import type { RawEvent } from '../content/schema';
import { EventMapper } from '../mappers/EventMapper';

export class StaticEventRepository implements EventRepository {
  private readonly raw: RawEvent;
  private cache: HackathonEvent | null = null;

  constructor(raw: RawEvent) {
    this.raw = raw;
  }

  async get(): Promise<HackathonEvent> {
    this.cache ??= EventMapper.toDomain(this.raw);
    return this.cache;
  }
}
