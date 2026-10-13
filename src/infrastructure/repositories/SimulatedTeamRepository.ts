import type { Team, TeamRepository } from '@domain/index';
import { ContentMapper } from '../mappers/ContentMapper';
import type { SimulatedTeamStore } from '../registration/SimulatedTeamStore';

// dev ou prévia (PUBLIC_REGISTRATION_SIMULATED=true) sem planilha: as equipes da simulação fazem o papel da
// lista ao vivo
export class SimulatedTeamRepository implements TeamRepository {
  private readonly store: SimulatedTeamStore;

  constructor(store: SimulatedTeamStore) {
    this.store = store;
  }

  list(): Promise<Team[]> {
    const teams = this.store.list().flatMap((raw) => {
      try {
        return [ContentMapper.toTeam(raw)];
      } catch {
        return [];
      }
    });
    return Promise.resolve(teams);
  }
}
