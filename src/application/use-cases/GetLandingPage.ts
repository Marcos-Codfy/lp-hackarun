import type { LandingPageDTO } from '../dto';
import type { GetEventOverview } from './GetEventOverview';
import type { GetSchedule } from './GetSchedule';
import type { ListMissions } from './ListMissions';
import type { ListTeams } from './ListTeams';
import type { ListSpeakers } from './ListSpeakers';
import type { ListPrizes } from './ListPrizes';
import type { ListPartners } from './ListPartners';
import type { ListFaq } from './ListFaq';

// facade: a página pede tudo de uma vez no build
export class GetLandingPage {
  private readonly deps: {
    overview: GetEventOverview;
    schedule: GetSchedule;
    missions: ListMissions;
    teams: ListTeams;
    speakers: ListSpeakers;
    prizes: ListPrizes;
    partners: ListPartners;
    faq: ListFaq;
  };

  constructor(deps: GetLandingPage['deps']) {
    this.deps = deps;
  }

  async execute(): Promise<LandingPageDTO> {
    const d = this.deps;
    const [event, schedule, missions, teams, speakers, prizes, partners, faq] = await Promise.all([
      d.overview.execute(),
      d.schedule.execute(),
      d.missions.execute(),
      d.teams.execute(),
      d.speakers.execute(),
      d.prizes.execute(),
      d.partners.execute(),
      d.faq.execute(),
    ]);
    return { event, schedule, missions, teams, speakers, prizes, partners, faq };
  }
}
