import type { MentorPayload, MentorRegistrationGateway } from '@application/index';
import type { AppsScriptClient } from './AppsScriptClient';
import { AppsScriptSubmitGateway } from './AppsScriptSubmitGateway';

// adapter: porta MentorRegistrationGateway -> Web App do Apps Script (ação "register-mentor", aba Mentores)
export class AppsScriptMentorGateway
  extends AppsScriptSubmitGateway<MentorPayload>
  implements MentorRegistrationGateway
{
  constructor(client: AppsScriptClient) {
    super(client, 'register-mentor');
  }
}
