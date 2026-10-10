import type { Prize } from '../entities/Prize';

export interface PrizeRepository {
  list(): Promise<Prize[]>;
}
