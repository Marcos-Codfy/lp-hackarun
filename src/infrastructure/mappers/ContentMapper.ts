import {
  DomainError,
  FaqItem,
  Partner,
  Prize,
  ScoringRule,
  Speaker,
  Station,
  Team,
  TeamName,
} from '@domain/index';
import type { RawFaqItem, RawPartner, RawPrize, RawSpeaker, RawStations, RawTeam } from '../content/schema';

export class ContentMapper {
  static toStations(raw: RawStations): Station[] {
    return raw.stations.map((s) => Station.create({ ...s, skills: s.skills ?? [] }));
  }

  static toScoring(raw: RawStations): ScoringRule {
    return ScoringRule.create(raw.scoring.maxPoints, raw.scoring.criteria);
  }

  // nome inválido explode: no build quebra o deploy, na lista ao vivo a linha é descartada
  static toTeam(raw: RawTeam): Team {
    const name = TeamName.create(raw.name);
    if (!name.ok) throw new DomainError(`Team ${raw.id}: ${name.error}`);
    return Team.create({
      id: raw.id,
      name: name.value,
      members: raw.members ?? [],
      ...(raw.memberCount !== undefined && { memberCount: raw.memberCount }),
      course: raw.course ?? null,
      mentor: raw.mentor ?? null,
      status: raw.status ?? 'confirmed',
      imageUrl: raw.imageUrl ?? null,
    });
  }

  static toSpeaker(raw: RawSpeaker): Speaker {
    return Speaker.create({ ...raw, topic: raw.topic ?? null, avatarUrl: raw.avatarUrl ?? null });
  }

  static toPrize(raw: RawPrize): Prize {
    return Prize.create({ ...raw, reward: raw.reward ?? null });
  }

  static toPartner(raw: RawPartner): Partner {
    return Partner.create({ ...raw, url: raw.url ?? null, logo: raw.logo ?? null });
  }

  static toFaqItem(raw: RawFaqItem): FaqItem {
    return FaqItem.create(raw);
  }
}
