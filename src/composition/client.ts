// composition root do browser: casos de uso + adapters do lado do cliente (three/gsap ficam de fora).
// A inscrição (envio + foto) mora em registration.ts e só baixa quando o formulário chega perto da tela
import teamsData from '@infrastructure/content/teams.json';
import type { RawTeam } from '@infrastructure/content/schema';
// direto do arquivo (sem o barrel @application/index): o barrel puxaria a inscrição pro chunk comum
import { GetCountdown } from '@application/use-cases/GetCountdown';
import { ListTeams } from '@application/use-cases/ListTeams';
import type { Clock } from '@application/ports/Clock';
import type { PreferenceStore } from '@application/ports/PreferenceStore';
import type { AppConfig } from '@presentation/app/AppConfig';
import { SystemClock } from '@infrastructure/clock/SystemClock';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { SimulatedTeamStore } from '@infrastructure/registration/SimulatedTeamStore';
import { AppsScriptTeamRepository } from '@infrastructure/repositories/AppsScriptTeamRepository';
import { FallbackTeamRepository } from '@infrastructure/repositories/FallbackTeamRepository';
import { SimulatedTeamRepository } from '@infrastructure/repositories/SimulatedTeamRepository';
import { StaticTeamRepository } from '@infrastructure/repositories/StaticContentRepositories';
import { LocalPreferenceStore } from '@infrastructure/storage/LocalPreferenceStore';
import { registrationMode, SIMULATION_ENABLED } from '@shared/config/registrationMode';
import type { RegistrationServices } from './registration';

export type { RegistrationServices } from './registration';

export interface ClientContainer {
  clock: Clock;
  getCountdown: GetCountdown;
  // envio e foto da inscrição: chunk à parte (registration.ts), baixado uma vez na 1ª chamada
  loadRegistration(): Promise<RegistrationServices>;
  // null = sem planilha configurada, fica só a lista do build
  listTeams: ListTeams | null;
  preferences: PreferenceStore;
}

// ?now=2026-11-14T16:00:00-03:00 desloca o relógio pra conferir a troca de marcos do contador
class ShiftedClock implements Clock {
  private readonly offsetMs: number;

  constructor(offsetMs: number) {
    this.offsetMs = offsetMs;
  }

  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }
}

function createClock(): Clock {
  const raw = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('now');
  const target = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(target) ? new SystemClock() : new ShiftedClock(target - Date.now());
}

// import tardio memorizado: quebrou (rede caiu), a próxima chamada tenta de novo
function registrationLoader(
  config: AppConfig,
  clock: Clock,
  simulated: SimulatedTeamStore | null,
): () => Promise<RegistrationServices> {
  let loading: Promise<RegistrationServices> | null = null;
  return () => {
    loading ??= import('./registration')
      .then(({ createRegistrationServices }) => createRegistrationServices(config, clock, simulated))
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
    return loading;
  };
}

function createListTeams(endpoint: string | null, simulated: SimulatedTeamStore | null): ListTeams | null {
  if (!endpoint) {
    return SIMULATION_ENABLED && simulated ? new ListTeams(new SimulatedTeamRepository(simulated)) : null;
  }
  const live = new AppsScriptTeamRepository(new AppsScriptClient(endpoint));
  const bundled = new StaticTeamRepository(teamsData as RawTeam[]);
  return new ListTeams(new FallbackTeamRepository(live, bundled));
}

// simulation: o build liberou a simulação (SIMULATION_ENABLED); os testes passam false pra ficar sem ela
export function createClientContainer(config: AppConfig, options: { simulation: boolean }): ClientContainer {
  const clock = createClock();
  // dev ou prévia sem planilha: inscrição e lista de equipes simuladas, ligadas entre si (a foto aparece em
  // /equipes). Build sem a flag: SIMULATION_ENABLED vira false e a simulação nem entra no bundle
  const simulated =
    SIMULATION_ENABLED && registrationMode(config.registration.endpoint, options.simulation) === 'simulated'
      ? new SimulatedTeamStore()
      : null;
  return {
    clock,
    getCountdown: new GetCountdown(clock, config.milestones),
    loadRegistration: registrationLoader(config, clock, simulated),
    listTeams: createListTeams(config.teamsEndpoint, simulated),
    preferences: new LocalPreferenceStore(),
  };
}
