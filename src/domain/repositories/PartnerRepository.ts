import type { Partner } from '../entities/Partner';

export interface PartnerRepository {
  list(): Promise<Partner[]>;
}
