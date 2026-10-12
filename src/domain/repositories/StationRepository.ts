import type { Station } from '../entities/Station';
import type { ScoringRule } from '../value-objects/ScoringRule';

export interface StationRepository {
  list(): Promise<Station[]>;
  // null = pontuação ainda não publicada (sai no regulamento)
  scoring(): Promise<ScoringRule | null>;
}
