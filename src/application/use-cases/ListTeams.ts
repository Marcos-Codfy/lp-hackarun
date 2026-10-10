import type { TeamRepository } from '@domain/index';
import type { TeamDTO } from '../dto';
import { normalizeSearch } from '@shared/utils/text';
import { toTeamDTO } from './mappers';

export class ListTeams {
  private readonly teams: TeamRepository;

  constructor(teams: TeamRepository) {
    this.teams = teams;
  }

  async execute(query = ''): Promise<TeamDTO[]> {
    const needle = normalizeSearch(query);
    const teams = await this.teams.list();
    return teams
      .filter((t) => t.matches(needle))
      .sort(
        (a, b) =>
          Number(b.isConfirmed) - Number(a.isConfirmed) || a.name.value.localeCompare(b.name.value, 'pt-BR'),
      )
      .map(toTeamDTO);
  }
}
