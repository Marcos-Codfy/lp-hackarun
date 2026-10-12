import type { StationRepository } from '@domain/index';
import type { MissionsDTO } from '../dto';
import { toScoringDTO, toStationDTO } from './mappers';

export class ListMissions {
  private readonly stations: StationRepository;

  constructor(stations: StationRepository) {
    this.stations = stations;
  }

  async execute(): Promise<MissionsDTO> {
    const [stations, scoring] = await Promise.all([this.stations.list(), this.stations.scoring()]);
    return {
      stations: [...stations].sort((a, b) => a.order - b.order).map(toStationDTO),
      scoring: scoring ? toScoringDTO(scoring) : null,
    };
  }
}
