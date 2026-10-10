import {
  RegistrationGatewayError,
  type RegistrationGateway,
  type RegistrationReceipt,
} from '@application/index';

// null object de produção sem endpoint: qualquer envio vira "inscrições encerradas"
export class UnavailableRegistrationGateway implements RegistrationGateway {
  submit(): Promise<RegistrationReceipt> {
    return Promise.reject(new RegistrationGatewayError('closed', 'No registration endpoint'));
  }
}
