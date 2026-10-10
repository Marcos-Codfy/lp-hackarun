import type { Speaker } from '../entities/Speaker';

export interface SpeakerRepository {
  list(): Promise<Speaker[]>;
}
