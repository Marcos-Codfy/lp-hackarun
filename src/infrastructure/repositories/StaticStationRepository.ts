import type { ScoringRule, Station, StationRepository } from '@domain/index';
import type { RawStations } from '../content/schema';
import { ContentMapper } from '../mappers/ContentMapper';

export class StaticStationRepository implements StationRepository {
  private readonly raw: RawStations;

  constructor(raw: RawStations) {
    this.raw = raw;
  }

  async list(): Promise<Station[]> {
    return ContentMapper.toStations(this.raw);
  }

  async scoring(): Promise<ScoringRule | null> {
    return ContentMapper.toScoring(this.raw);
  }
}
