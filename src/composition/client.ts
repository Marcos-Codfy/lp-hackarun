// composition root do browser: casos de uso + adapters do lado do cliente (three/gsap ficam de fora)
import teamsData from '@infrastructure/content/teams.json';
import type { RawTeam } from '@infrastructure/content/schema';
import { GetCountdown, ListTeams, PrepareTeamImage, SubmitRegistration } from '@application/index';
import type { Clock, RegistrationGateway } from '@application/index';
import type { PreferenceStore } from '@application/ports/PreferenceStore';
import type { AppConfig } from '@presentation/app/AppConfig';
import { SystemClock } from '@infrastructure/clock/SystemClock';
import { CanvasImageCodec } from '@infrastructure/image/CanvasImageCodec';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptRegistrationGateway } from '@infrastructure/registration/AppsScriptRegistrationGateway';
import { RetryingRegistrationGateway } from '@infrastructure/registration/RetryingRegistrationGateway';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';
import { UnavailableRegistrationGateway } from '@infrastructure/registration/UnavailableRegistrationGateway';
import { SimulatedTeamStore } from '@infrastructure/registration/SimulatedTeamStore';
import { AppsScriptTeamRepository } from '@infrastructure/repositories/AppsScriptTeamRepository';
import { FallbackTeamRepository } from '@infrastructure/repositories/FallbackTeamRepository';
import { SimulatedTeamRepository } from '@infrastructure/repositories/SimulatedTeamRepository';
import { StaticTeamRepository } from '@infrastructure/repositories/StaticContentRepositories';
import { LocalPreferenceStore } from '@infrastructure/storage/LocalPreferenceStore';

export interface ClientContainer {
  clock: Clock;
  getCountdown: GetCountdown;
  submitRegistration: SubmitRegistration;
  // foto/logo da equipe redimensionada no aparelho antes do envio
  prepareTeamImage: PrepareTeamImage;
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

function createGateway(endpoint: string | null, simulated: SimulatedTeamStore | null): RegistrationGateway {
  if (endpoint) {
    return new RetryingRegistrationGateway(new AppsScriptRegistrationGateway(new AppsScriptClient(endpoint)));
  }
  // dev sem planilha: simula o envio pra dar pra testar a UX local
  return simulated
    ? new InMemoryRegistrationGateway({ store: simulated })
    : new UnavailableRegistrationGateway();
}

function createListTeams(endpoint: string | null, simulated: SimulatedTeamStore | null): ListTeams | null {
  if (!endpoint) return simulated ? new ListTeams(new SimulatedTeamRepository(simulated)) : null;
  const live = new AppsScriptTeamRepository(new AppsScriptClient(endpoint));
  const bundled = new StaticTeamRepository(teamsData as RawTeam[]);
  return new ListTeams(new FallbackTeamRepository(live, bundled));
}

export function createClientContainer(config: AppConfig, options: { dev: boolean }): ClientContainer {
  const clock = createClock();
  // dev sem planilha: inscrição e lista de equipes simuladas, ligadas entre si (dá pra ver a foto em /equipes)
  const simulated = options.dev && !config.registration.endpoint ? new SimulatedTeamStore() : null;
  return {
    clock,
    getCountdown: new GetCountdown(clock, config.milestones),
    submitRegistration: new SubmitRegistration({
      gateway: createGateway(config.registration.endpoint, simulated),
      clock,
      teamSize: config.registration.teamSize,
      // prazo e vagas reavaliados no navegador: página gerada antes do prazo fecha o form depois dele
      window: config.registration,
    }),
    prepareTeamImage: new PrepareTeamImage(new CanvasImageCodec()),
    listTeams: createListTeams(config.teamsEndpoint, simulated),
    preferences: new LocalPreferenceStore(),
  };
}
