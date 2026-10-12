import type { ActivityDTO, SessionDTO } from '@application/index';

type Audience = SessionDTO['audience'];
type ActivityFlag = ActivityDTO['flags'][number];

// selo de público da programação: texto curto + tom da paleta (ciano, violeta, laranja, ouro)
const AUDIENCE: Record<Audience, string> = {
  open: 'Aberto ao público',
  hackathon: 'Hackathon',
  teams: 'Só equipes e mentores',
  final: 'Final com público',
};

const FLAGS: Record<ActivityFlag, string> = {
  parallel: 'Em paralelo',
  optional: 'Opcional',
  tbd: 'Tema a definir',
};

export class AudienceLabel {
  of(audience: Audience): string {
    return AUDIENCE[audience];
  }

  flag(flag: ActivityFlag): string {
    return FLAGS[flag];
  }
}
