// composition root do browser: casos de uso + adapters do lado do cliente (three/gsap ficam de fora)
import teamsData from '@infrastructure/content/teams.json';
import type { RawTeam } from '@infrastructure/content/schema';
import { GetCountdown, ListTeams, SubmitRegistration } from '@application/index';
import type { Clock, RegistrationGateway } from '@application/index';
import type { AppConfig } from '@presentation/app/AppConfig';
import { SystemClock } from '@infrastructure/clock/SystemClock';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptRegistrationGateway } from '@infrastructure/registration/AppsScriptRegistrationGateway';
import { RetryingRegistrationGateway } from '@infrastructure/registration/RetryingRegistrationGateway';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';
import { UnavailableRegistrationGateway } from '@infrastructure/registration/UnavailableRegistrationGateway';
import { AppsScriptTeamRepository } from '@infrastructure/repositories/AppsScriptTeamRepository';
import { FallbackTeamRepository } from '@infrastructure/repositories/FallbackTeamRepository';
import { StaticTeamRepository } from '@infrastructure/repositories/StaticContentRepositories';
import { LocalPreferenceStore } from '@infrastructure/storage/LocalPreferenceStore';
import type { PreferenceStore } from '@infrastructure/storage/PreferenceStore';
import { AudioEngine } from '@infrastructure/audio/AudioEngine';
import type { AudioCue } from '@infrastructure/audio/AudioCue';
import { FileAudioCue } from '@infrastructure/audio/FileAudioCue';
import { SynthAudioCue } from '@infrastructure/audio/SynthAudioCue';
import { NullAudioCue } from '@infrastructure/audio/NullAudioCue';

export interface ClientContainer {
  clock: Clock;
  getCountdown: GetCountdown;
  submitRegistration: SubmitRegistration;
  // null = sem planilha configurada, fica só a lista do build
  listTeams: ListTeams | null;
  preferences: PreferenceStore;
  audio: AudioEngine;
  cue: AudioCue;
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

function createGateway(endpoint: string | null, dev: boolean): RegistrationGateway {
  if (endpoint) {
    return new RetryingRegistrationGateway(new AppsScriptRegistrationGateway(new AppsScriptClient(endpoint)));
  }
  // dev sem planilha: simula o envio pra dar pra testar a UX local
  return dev ? new InMemoryRegistrationGateway() : new UnavailableRegistrationGateway();
}

function createListTeams(endpoint: string | null): ListTeams | null {
  if (!endpoint) return null;
  const live = new AppsScriptTeamRepository(new AppsScriptClient(endpoint));
  const bundled = new StaticTeamRepository(teamsData as RawTeam[]);
  return new ListTeams(new FallbackTeamRepository(live, bundled));
}

function createCue(audio: AudioEngine, url: string | null): AudioCue {
  if (!audio.isSupported) return new NullAudioCue();
  const synth = new SynthAudioCue(audio);
  return url ? new FileAudioCue(audio, url, synth) : synth;
}

export function createClientContainer(config: AppConfig, options: { dev: boolean }): ClientContainer {
  const clock = createClock();
  const audio = new AudioEngine();
  return {
    clock,
    getCountdown: new GetCountdown(clock, config.milestones),
    submitRegistration: new SubmitRegistration({
      gateway: createGateway(config.registration.endpoint, options.dev),
      clock,
      teamSize: config.registration.teamSize,
    }),
    listTeams: createListTeams(config.teamsEndpoint),
    preferences: new LocalPreferenceStore(),
    audio,
    cue: createCue(audio, config.audioCueUrl),
  };
}
