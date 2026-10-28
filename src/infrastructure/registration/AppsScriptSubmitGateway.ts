import { RegistrationGatewayError, type GatewayFailure, type RegistrationReceipt } from '@application/index';
import { AppsScriptHttpError, type AppsScriptClient } from './AppsScriptClient';

// sem foto, o envio é pequeno; a folga é pra rede lenta de celular e pro Apps Script acordar
const TIMEOUT_MS = 20_000;

// erros que o Code.gs devolve -> falhas que a aplicação entende
const SERVER_ERRORS = new Map<string, GatewayFailure>([
  ['duplicate', 'duplicate'],
  ['duplicate_email', 'duplicate-email'],
  ['duplicate_whatsapp', 'duplicate-whatsapp'],
  ['duplicate_student_id', 'duplicate-student-id'],
  ['closed', 'closed'],
  ['invalid', 'rejected'],
  ['rate-limited', 'rate-limited'],
  ['server', 'server'],
]);

interface ServerResponse {
  ok?: unknown;
  protocol?: unknown;
  error?: unknown;
}

// adapter: um POST do Web App do Apps Script que grava na planilha e devolve o protocolo. A inscrição ("register")
// e o cadastro de mentor ("register-mentor") falam o mesmo protocolo; só a ação muda
export class AppsScriptSubmitGateway<P extends object> {
  private readonly client: AppsScriptClient;
  private readonly action: string;

  constructor(client: AppsScriptClient, action: string) {
    this.client = client;
    this.action = action;
  }

  async submit(payload: P): Promise<RegistrationReceipt> {
    let response: unknown;
    try {
      response = await this.client.post({ action: this.action, ...payload }, TIMEOUT_MS);
    } catch (error) {
      if (error instanceof AppsScriptHttpError && error.status === 429) {
        throw new RegistrationGatewayError('rate-limited', 'Too many requests');
      }
      // 5xx = o Google respondeu, mas o script caiu (cota, exceção fora do try): a rede está ok
      if (error instanceof AppsScriptHttpError && error.status >= 500) {
        throw new RegistrationGatewayError('server', error.message);
      }
      throw new RegistrationGatewayError('network', AppsScriptSubmitGateway.describe(error));
    }
    return AppsScriptSubmitGateway.parse(response);
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
    throw new RegistrationGatewayError(SERVER_ERRORS.get(code) ?? 'rejected', code || 'Rejected');
  }

  private static describe(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') return 'Timeout';
    return error instanceof Error ? error.message : 'Network error';
  }
}
