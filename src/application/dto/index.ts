// DTOs serializáveis: é o que sai da aplicação pra camada de apresentação
import type {
  EventStage,
  FaqItem,
  MilestoneKey,
  PartnerRole,
  RegistrationStatus,
  SessionKind,
  SlotsLevel,
  SpeakerRole,
  StationKind,
  TeamImageType,
  TeamStatus,
  VenueRole,
} from '@domain/index';

export interface VenueDTO {
  id: string;
  name: string;
  shortName: string;
  city: string;
  role: VenueRole;
  mapUrl: string | null;
}

export interface SessionDTO {
  id: string;
  title: string;
  kind: SessionKind;
  start: string | null;
  end: string | null;
  startHint: string | null;
  venue: VenueDTO;
  description: string;
  topics: string[];
}

export interface EventDayDTO {
  id: string;
  date: string;
  stage: EventStage;
  title: string;
  summary: string;
  sessions: SessionDTO[];
}

export interface MilestoneDTO {
  key: MilestoneKey;
  label: string;
  at: string;
}

export interface SlotsDTO {
  capacity: number | null;
  taken: number;
  remaining: number | null;
  level: SlotsLevel;
}

export interface RegistrationDTO {
  status: RegistrationStatus;
  endpoint: string | null;
  closesAt: string | null;
  slots: SlotsDTO;
  teamSize: { min: number; max: number };
}

export interface EventStatsDTO {
  days: number;
  stations: number;
  workshops: number;
}

export interface EventOverviewDTO {
  name: string;
  edition: string;
  tagline: string;
  city: string;
  timezone: string;
  firstDate: string;
  lastDate: string;
  venues: VenueDTO[];
  milestones: MilestoneDTO[];
  registration: RegistrationDTO;
  stats: EventStatsDTO;
}

export interface StationDTO {
  id: string;
  order: number;
  code: string;
  title: string;
  challenge: string;
  space: string;
  kind: StationKind;
  skills: string[];
}

export interface ScoringCriterionDTO {
  key: string;
  label: string;
  points: number;
  share: number;
}

export interface ScoringDTO {
  maxPoints: number;
  criteria: ScoringCriterionDTO[];
}

export interface MissionsDTO {
  stations: StationDTO[];
  scoring: ScoringDTO;
}

export interface TeamDTO {
  id: string;
  name: string;
  members: string[];
  memberCount: number;
  course: string | null;
  mentor: string | null;
  status: TeamStatus;
  // url pública da foto/logo (Drive) ou null: a página mostra as iniciais
  imageUrl: string | null;
}

// foto/logo já redimensionada no navegador, pronta pra ir no envio
export interface PreparedTeamImageDTO {
  mimeType: TeamImageType;
  base64: string;
  width: number;
  height: number;
  bytes: number;
}

export interface SpeakerDTO {
  id: string;
  name: string | null;
  role: SpeakerRole;
  headline: string;
  topic: string | null;
  avatarUrl: string | null;
  revealed: boolean;
}

export interface PrizeDTO {
  id: string;
  rank: number | null;
  title: string;
  description: string;
  reward: string | null;
  revealed: boolean;
}

export interface PartnerDTO {
  id: string;
  name: string;
  role: PartnerRole;
  url: string | null;
  logo: string | null;
}

export type FaqItemDTO = Pick<FaqItem, 'id' | 'question' | 'answer' | 'category'>;

export interface CountdownDTO {
  key: MilestoneKey | null;
  label: string;
  target: string | null;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOver: boolean;
}

export interface LandingPageDTO {
  event: EventOverviewDTO;
  schedule: EventDayDTO[];
  missions: MissionsDTO;
  teams: TeamDTO[];
  speakers: SpeakerDTO[];
  prizes: PrizeDTO[];
  partners: PartnerDTO[];
  faq: FaqItemDTO[];
}
