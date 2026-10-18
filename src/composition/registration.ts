// inscrição do lado do cliente (envio + contagem de vagas): chunk à parte, que só baixa na página /inscricao.
// O resto do container fica no client.ts
import { SubmitRegistration } from '@application/use-cases/SubmitRegistration';
import type { Clock } from '@application/ports/Clock';
import type { RegistrationCounter } from '@application/ports/RegistrationCounter';
import type { RegistrationGateway } from '@application/ports/RegistrationGateway';
import type { AppConfig } from '@presentation/app/AppConfig';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptRegistrationCounter } from '@infrastructure/registration/AppsScriptRegistrationCounter';
import { AppsScriptRegistrationGateway } from '@infrastructure/registration/AppsScriptRegistrationGateway';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';
import { RetryingRegistrationGateway } from '@infrastructure/registration/RetryingRegistrationGateway';
import { UnavailableRegistrationGateway } from '@infrastructure/registration/UnavailableRegistrationGateway';
import { SIMULATION_ENABLED } from '@shared/config/registrationMode';

export interface RegistrationServices {
  submitRegistration: SubmitRegistration;
  // inscrições que já ocupam vaga, contadas pela planilha (null = sem planilha)
  counter: RegistrationCounter | null;
}

interface Backend {
  gateway: RegistrationGateway;
  counter: RegistrationCounter | null;
}

function createBackend(endpoint: string | null, simulated: boolean): Backend {
  if (endpoint) {
    const client = new AppsScriptClient(endpoint);
    return {
      gateway: new RetryingRegistrationGateway(new AppsScriptRegistrationGateway(client)),
      counter: new AppsScriptRegistrationCounter(client),
    };
  }
  // dev ou prévia sem planilha: simula o envio (nada vai pra planilha); o endpoint sempre ganha, acima
  if (SIMULATION_ENABLED && simulated) {
    const memory = new InMemoryRegistrationGateway();
    return { gateway: memory, counter: memory };
  }
  return { gateway: new UnavailableRegistrationGateway(), counter: null };
}

export function createRegistrationServices(
  config: AppConfig,
  clock: Clock,
  simulated: boolean,
): RegistrationServices {
  const { gateway, counter } = createBackend(config.registration.endpoint, simulated);
  return {
    submitRegistration: new SubmitRegistration({
      gateway,
      clock,
      teamSize: config.registration.teamSize,
      // prazo e vagas reavaliados no navegador: página gerada antes do prazo fecha o form depois dele
      window: config.registration,
    }),
    counter,
  };
}
