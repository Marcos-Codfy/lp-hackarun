// inscrição do lado do cliente (envio + foto da equipe): chunk à parte, que só baixa quando o
// formulário chega perto da tela (views/mountViews). O resto do container fica no client.ts
import { PrepareTeamImage } from '@application/use-cases/PrepareTeamImage';
import { SubmitRegistration } from '@application/use-cases/SubmitRegistration';
import type { Clock } from '@application/ports/Clock';
import type { RegistrationGateway } from '@application/ports/RegistrationGateway';
import type { AppConfig } from '@presentation/app/AppConfig';
import { CanvasImageCodec } from '@infrastructure/image/CanvasImageCodec';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptRegistrationGateway } from '@infrastructure/registration/AppsScriptRegistrationGateway';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';
import { RetryingRegistrationGateway } from '@infrastructure/registration/RetryingRegistrationGateway';
import { UnavailableRegistrationGateway } from '@infrastructure/registration/UnavailableRegistrationGateway';
import type { SimulatedTeamStore } from '@infrastructure/registration/SimulatedTeamStore';

export interface RegistrationServices {
  submitRegistration: SubmitRegistration;
  // foto/logo da equipe redimensionada no aparelho antes do envio
  prepareTeamImage: PrepareTeamImage;
}

function createGateway(endpoint: string | null, simulated: SimulatedTeamStore | null): RegistrationGateway {
  if (endpoint) {
    return new RetryingRegistrationGateway(new AppsScriptRegistrationGateway(new AppsScriptClient(endpoint)));
  }
  // dev sem planilha: simula o envio pra dar pra testar a UX local
  return import.meta.env.DEV && simulated
    ? new InMemoryRegistrationGateway({ store: simulated })
    : new UnavailableRegistrationGateway();
}

// `simulated` é o mesmo store da lista de equipes do client.ts: a equipe inscrita aparece em /equipes
export function createRegistrationServices(
  config: AppConfig,
  clock: Clock,
  simulated: SimulatedTeamStore | null,
): RegistrationServices {
  return {
    submitRegistration: new SubmitRegistration({
      gateway: createGateway(config.registration.endpoint, simulated),
      clock,
      teamSize: config.registration.teamSize,
      // prazo e vagas reavaliados no navegador: página gerada antes do prazo fecha o form depois dele
      window: config.registration,
    }),
    prepareTeamImage: new PrepareTeamImage(new CanvasImageCodec()),
  };
}
