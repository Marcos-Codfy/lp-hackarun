import {
  RegistrationGatewayError,
  type GatewayFailure,
  type RegistrationGateway,
  type RegistrationPayload,
  type RegistrationReceipt,
} from '@application/index';
import { AppsScriptHttpError, type AppsScriptClient } from './AppsScriptClient';

// a foto da equipe sobe junto (até ~550 KB em base64): rede lenta de celular precisa de folga
const TIMEOUT_MS = 30_000;

// erros que o Code.gs devolve -> falhas que a aplicação entende
const SERVER_ERRORS: Record<string, GatewayFailure> = {
  duplicate: 'duplicate',
  closed: 'closed',
  invalid: 'rejected',
  'rate-limited': 'rate-limited',
  server: 'server',
};

interface ServerResponse {
  ok?: unknown;
  protocol?: unknown;
  error?: unknown;
}

// adapter: porta RegistrationGateway -> Web App do Apps Script que grava na planilha
export class AppsScriptRegistrationGateway implements RegistrationGateway {
  private readonly client: AppsScriptClient;

  constructor(client: AppsScriptClient) {
    this.client = client;
  }

  async submit(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    let response: unknown;
    try {
      response = await this.client.post({ action: 'register', ...payload }, TIMEOUT_MS);
    } catch (error) {
      if (error instanceof AppsScriptHttpError && error.status === 429) {
        throw new RegistrationGatewayError('rate-limited', 'Too many requests');
      }
      // 5xx = o Google respondeu, mas o script caiu (cota, exceção fora do try): a rede está ok
      if (error instanceof AppsScriptHttpError && error.status >= 500) {
        throw new RegistrationGatewayError('server', error.message);
      }
      throw new RegistrationGatewayError('network', AppsScriptRegistrationGateway.describe(error));
    }
    return AppsScriptRegistrationGateway.parse(response);
  }

  private static parse(response: unknown): RegistrationReceipt {
    if (typeof response !== 'object' || response === null) {
      throw new RegistrationGatewayError('network', 'Unexpected response');
    }
    const body = response as ServerResponse;
    if (body.ok === true && typeof body.protocol === 'string' && body.protocol) {
      return { protocol: body.protocol };
    }
    const code = typeof body.error === 'string' ? body.error : '';
    throw new RegistrationGatewayError(SERVER_ERRORS[code] ?? 'rejected', code || 'Rejected');
  }

  private static describe(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') return 'Timeout';
    return error instanceof Error ? error.message : 'Network error';
  }
}
