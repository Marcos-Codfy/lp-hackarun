// composition root do build (SSG): único lugar que conhece as implementações concretas
import eventData from '@infrastructure/content/event.json';
import stationsData from '@infrastructure/content/stations.json';
import teamsData from '@infrastructure/content/teams.json';
import speakersData from '@infrastructure/content/speakers.json';
import prizesData from '@infrastructure/content/prizes.json';
import partnersData from '@infrastructure/content/partners.json';
import faqData from '@infrastructure/content/faq.json';
import type {
  RawEvent,
  RawFaqItem,
  RawPartner,
  RawPrize,
  RawSpeaker,
  RawStations,
  RawTeam,
} from '@infrastructure/content/schema';
import { RegistrationPolicy } from '@domain/index';
import {
  GetEventOverview,
  GetLandingPage,
  GetSchedule,
  ListFaq,
  ListMissions,
  ListPartners,
  ListPrizes,
  ListSpeakers,
  ListTeams,
} from '@application/index';
import { StaticEventRepository } from '@infrastructure/repositories/StaticEventRepository';
import { StaticStationRepository } from '@infrastructure/repositories/StaticStationRepository';
import {
  StaticFaqRepository,
  StaticPartnerRepository,
  StaticPrizeRepository,
  StaticSpeakerRepository,
  StaticTeamRepository,
} from '@infrastructure/repositories/StaticContentRepositories';
import { SystemClock } from '@infrastructure/clock/SystemClock';
import { withEnvOverrides } from '@infrastructure/config/env';

function createServerContainer() {
  const clock = new SystemClock();
  const events = new StaticEventRepository(withEnvOverrides(eventData as RawEvent));
  const stations = new StaticStationRepository(stationsData as RawStations);
  const teams = new StaticTeamRepository(teamsData as RawTeam[]);
  const speakers = new StaticSpeakerRepository(speakersData as RawSpeaker[]);
  const prizes = new StaticPrizeRepository(prizesData as RawPrize[]);
  const partners = new StaticPartnerRepository(partnersData as RawPartner[]);
  const faq = new StaticFaqRepository(faqData as RawFaqItem[]);

  const overview = new GetEventOverview({ events, stations, teams, policy: new RegistrationPolicy(), clock });

  return {
    getLandingPage: new GetLandingPage({
      overview,
      schedule: new GetSchedule(events),
      missions: new ListMissions(stations),
      teams: new ListTeams(teams),
      speakers: new ListSpeakers(speakers),
      prizes: new ListPrizes(prizes),
      partners: new ListPartners(partners),
      faq: new ListFaq(faq),
    }),
  };
}

export type ServerContainer = ReturnType<typeof createServerContainer>;

let instance: ServerContainer | null = null;

// singleton por processo de build
export function serverContainer(): ServerContainer {
  instance ??= createServerContainer();
  return instance;
}
