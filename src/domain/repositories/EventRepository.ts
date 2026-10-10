import type { HackathonEvent } from '../entities/HackathonEvent';

export interface EventRepository {
  get(): Promise<HackathonEvent>;
}
