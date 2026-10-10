import type { PrizeRepository } from '@domain/index';
import type { PrizeDTO } from '../dto';
import { toPrizeDTO } from './mappers';

export class ListPrizes {
  private readonly prizes: PrizeRepository;

  constructor(prizes: PrizeRepository) {
    this.prizes = prizes;
  }

  async execute(): Promise<PrizeDTO[]> {
    const list = await this.prizes.list();
    return [...list].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map(toPrizeDTO);
  }
}
