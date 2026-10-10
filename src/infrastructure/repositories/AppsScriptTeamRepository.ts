import type { Team, TeamRepository } from '@domain/index';
import type { AppsScriptClient } from '../registration/AppsScriptClient';
import { ContentMapper } from '../mappers/ContentMapper';

const TIMEOUT_MS = 6_000;

interface TeamRow {
  id?: unknown;
  name?: unknown;
  course?: unknown;
  memberCount?: unknown;
}

// equipes confirmadas na planilha (GET ?action=teams); a planilha nunca manda dado pessoal
export class AppsScriptTeamRepository implements TeamRepository {
  private readonly client: AppsScriptClient;

  constructor(client: AppsScriptClient) {
    this.client = client;
  }

  async list(): Promise<Team[]> {
    const response = (await this.client.get({ action: 'teams' }, TIMEOUT_MS)) as {
      ok?: unknown;
      teams?: unknown;
    };
    if (response?.ok !== true || !Array.isArray(response.teams)) throw new Error('Invalid teams response');
    return (response.teams as TeamRow[]).flatMap((row) => AppsScriptTeamRepository.toTeam(row));
  }

  // linha torta na planilha (nome vazio, gigante...) é ignorada em vez de derrubar a lista
  private static toTeam(row: TeamRow): Team[] {
    if (typeof row.id !== 'string' || typeof row.name !== 'string') return [];
    const count = Number(row.memberCount);
    try {
      return [
        ContentMapper.toTeam({
          id: row.id,
          name: row.name,
          course: typeof row.course === 'string' && row.course.trim() ? row.course.trim() : null,
          // equipe confirmada tem pelo menos 1 pessoa, mesmo se a célula vier torta
          memberCount: Number.isFinite(count) && count > 0 ? Math.round(count) : 1,
          status: 'confirmed',
        }),
      ];
    } catch {
      return [];
    }
  }
}
