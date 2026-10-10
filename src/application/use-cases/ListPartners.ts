import type { PartnerRepository } from '@domain/index';
import type { PartnerDTO } from '../dto';
import { toPartnerDTO } from './mappers';

const ROLE_ORDER = { organizer: 0, partner: 1, supporter: 2 } as const;

export class ListPartners {
  private readonly partners: PartnerRepository;

  constructor(partners: PartnerRepository) {
    this.partners = partners;
  }

  async execute(): Promise<PartnerDTO[]> {
    const list = await this.partners.list();
    return [...list].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]).map(toPartnerDTO);
  }
}
