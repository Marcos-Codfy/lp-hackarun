// formato cru dos JSONs de conteúdo (o que a equipe edita)
import type {
  EventStage,
  MilestoneKey,
  PartnerRole,
  SessionKind,
  SpeakerRole,
  StationKind,
  TeamStatus,
  VenueRole,
} from '@domain/index';

export interface RawVenue {
  id: string;
  name: string;
  shortName: string;
  city: string;
  role: VenueRole;
  mapUrl?: string | null;
}

export interface RawSession {
  id: string;
  title: string;
  kind: SessionKind;
  start: string | null;
  end: string | null;
  startHint?: string | null;
  venueId: string;
  description: string;
  topics?: string[];
}

export interface RawEventDay {
  id: string;
  date: string;
  stage: EventStage;
  title: string;
  summary: string;
  sessions: RawSession[];
}

export interface RawEvent {
  id: string;
  name: string;
  edition: string;
  tagline: string;
  city: string;
  timezone: string;
  venues: RawVenue[];
  milestones: { key: MilestoneKey; label: string; at: string }[];
  registration: {
    endpoint?: string | null;
    closesAt?: string | null;
    capacity?: number | null;
    teamSize?: { min: number; max: number } | null;
  };
  days: RawEventDay[];
}

export interface RawStations {
  scoring: { maxPoints: number; criteria: { key: string; label: string; points: number }[] };
  stations: {
    id: string;
    order: number;
    title: string;
    challenge: string;
    space: string;
    kind: StationKind;
    skills?: string[];
  }[];
}

export interface RawTeam {
  id: string;
  name: string;
  members?: string[];
  memberCount?: number;
  course?: string | null;
  mentor?: string | null;
  status?: TeamStatus;
  // url https da foto/logo (a lista ao vivo monta a partir do id do Drive)
  imageUrl?: string | null;
}

export interface RawSpeaker {
  id: string;
  name: string | null;
  role: SpeakerRole;
  headline: string;
  topic?: string | null;
  avatarUrl?: string | null;
}

export interface RawPrize {
  id: string;
  rank: number | null;
  title: string;
  description: string;
  reward?: string | null;
}

export interface RawPartner {
  id: string;
  name: string;
  role: PartnerRole;
  url?: string | null;
  logo?: string | null;
}

export interface RawFaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}
