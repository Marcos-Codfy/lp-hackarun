import type { Station } from '../entities/Station';
import type { ScoringRule } from '../value-objects/ScoringRule';

export interface StationRepository {
  list(): Promise<Station[]>;
  scoring(): Promise<ScoringRule>;
}
