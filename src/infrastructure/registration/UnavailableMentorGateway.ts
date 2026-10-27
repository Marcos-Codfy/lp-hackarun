import {
  RegistrationGatewayError,
  type MentorRegistrationGateway,
  type RegistrationReceipt,
} from '@application/index';

// null object de produção sem endpoint: qualquer envio vira "cadastro encerrado"
export class UnavailableMentorGateway implements MentorRegistrationGateway {
  submit(): Promise<RegistrationReceipt> {
    return Promise.reject(new RegistrationGatewayError('closed', 'No registration endpoint'));
  }
}
