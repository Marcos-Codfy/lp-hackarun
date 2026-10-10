import type { FaqItem } from '../entities/FaqItem';

export interface FaqRepository {
  list(): Promise<FaqItem[]>;
}
