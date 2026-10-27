// cadastro de mentor do lado do cliente: chunk à parte, que só baixa na página /seja-mentor.
// O resto do container fica no client.ts
import { SubmitMentorRegistration } from '@application/use-cases/SubmitMentorRegistration';
import type { Clock } from '@application/ports/Clock';
import type { MentorRegistrationGateway } from '@application/ports/MentorRegistrationGateway';
import type { AppConfig } from '@presentation/app/AppConfig';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptMentorGateway } from '@infrastructure/registration/AppsScriptMentorGateway';
import { InMemoryMentorGateway } from '@infrastructure/registration/InMemoryMentorGateway';
import { RetryingMentorGateway } from '@infrastructure/registration/RetryingRegistrationGateway';
import { UnavailableMentorGateway } from '@infrastructure/registration/UnavailableMentorGateway';
import { SIMULATION_ENABLED } from '@shared/config/registrationMode';

export interface MentorServices {
  submitMentor: SubmitMentorRegistration;
}

function createGateway(endpoint: string | null, simulated: boolean): MentorRegistrationGateway {
  if (endpoint) return new RetryingMentorGateway(new AppsScriptMentorGateway(new AppsScriptClient(endpoint)));
  // dev ou prévia sem planilha: simula o envio (nada vai pra planilha); o endpoint sempre ganha, acima
  if (SIMULATION_ENABLED && simulated) return new InMemoryMentorGateway();
  return new UnavailableMentorGateway();
}

export function createMentorServices(config: AppConfig, clock: Clock, simulated: boolean): MentorServices {
  return {
    submitMentor: new SubmitMentorRegistration({
      gateway: createGateway(config.registration.endpoint, simulated),
      clock,
    }),
  };
}
