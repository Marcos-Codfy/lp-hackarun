import type { RegistrationGateway, RegistrationPayload } from '@application/index';
import type { AppsScriptClient } from './AppsScriptClient';
import { AppsScriptSubmitGateway } from './AppsScriptSubmitGateway';

// adapter: porta RegistrationGateway -> Web App do Apps Script que grava na planilha (aba Inscritos)
export class AppsScriptRegistrationGateway
  extends AppsScriptSubmitGateway<RegistrationPayload>
  implements RegistrationGateway
{
  constructor(client: AppsScriptClient) {
    super(client, 'register');
  }
}
