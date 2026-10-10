import type { Team } from '../entities/Team';

export interface TeamRepository {
  list(): Promise<Team[]>;
}
