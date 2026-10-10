import type { Team, TeamRepository } from '@domain/index';

// resiliência: planilha fora do ar (ou cota estourada) não pode zerar a lista do site
export class FallbackTeamRepository implements TeamRepository {
  private readonly primary: TeamRepository;
  private readonly fallback: TeamRepository;

  constructor(primary: TeamRepository, fallback: TeamRepository) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async list(): Promise<Team[]> {
    try {
      return await this.primary.list();
    } catch {
      return this.fallback.list();
    }
  }
}
