import type {
  FaqItem,
  FaqRepository,
  Partner,
  PartnerRepository,
  Prize,
  PrizeRepository,
  Speaker,
  SpeakerRepository,
  Team,
  TeamRepository,
} from '@domain/index';
import type { RawFaqItem, RawPartner, RawPrize, RawSpeaker, RawTeam } from '../content/schema';
import { ContentMapper } from '../mappers/ContentMapper';
import { StaticListRepository } from './StaticListRepository';

export class StaticTeamRepository extends StaticListRepository<RawTeam, Team> implements TeamRepository {
  constructor(raw: readonly RawTeam[]) {
    super(raw);
  }

  protected map(raw: RawTeam): Team {
    return ContentMapper.toTeam(raw);
  }
}

export class StaticSpeakerRepository
  extends StaticListRepository<RawSpeaker, Speaker>
  implements SpeakerRepository
{
  constructor(raw: readonly RawSpeaker[]) {
    super(raw);
  }

  protected map(raw: RawSpeaker): Speaker {
    return ContentMapper.toSpeaker(raw);
  }
}

export class StaticPrizeRepository extends StaticListRepository<RawPrize, Prize> implements PrizeRepository {
  constructor(raw: readonly RawPrize[]) {
    super(raw);
  }

  protected map(raw: RawPrize): Prize {
    return ContentMapper.toPrize(raw);
  }
}

export class StaticPartnerRepository
  extends StaticListRepository<RawPartner, Partner>
  implements PartnerRepository
{
  constructor(raw: readonly RawPartner[]) {
    super(raw);
  }

  protected map(raw: RawPartner): Partner {
    return ContentMapper.toPartner(raw);
  }
}

export class StaticFaqRepository extends StaticListRepository<RawFaqItem, FaqItem> implements FaqRepository {
  constructor(raw: readonly RawFaqItem[]) {
    super(raw);
  }

  protected map(raw: RawFaqItem): FaqItem {
    return ContentMapper.toFaqItem(raw);
  }
}
