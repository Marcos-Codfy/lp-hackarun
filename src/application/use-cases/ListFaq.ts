import type { FaqRepository } from '@domain/index';
import type { FaqItemDTO } from '../dto';
import { toFaqItemDTO } from './mappers';

export class ListFaq {
  private readonly faq: FaqRepository;

  constructor(faq: FaqRepository) {
    this.faq = faq;
  }

  async execute(): Promise<FaqItemDTO[]> {
    return (await this.faq.list()).map(toFaqItemDTO);
  }
}
