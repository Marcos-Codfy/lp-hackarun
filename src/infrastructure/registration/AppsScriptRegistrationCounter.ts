import type { RegistrationCounter } from '@application/index';
import type { AppsScriptClient } from './AppsScriptClient';

const TIMEOUT_MS = 8_000;

// GET ?action=slots: quantas inscrições ocupam vaga (canceladas não contam). Qualquer falha vira null
export class AppsScriptRegistrationCounter implements RegistrationCounter {
  private readonly client: AppsScriptClient;

  constructor(client: AppsScriptClient) {
    this.client = client;
  }

  async taken(): Promise<number | null> {
    try {
      const body = (await this.client.get({ action: 'slots' }, TIMEOUT_MS)) as {
        ok?: unknown;
        taken?: unknown;
      };
      const taken = body?.ok === true ? body.taken : null;
      return typeof taken === 'number' && Number.isInteger(taken) && taken >= 0 ? taken : null;
    } catch {
      return null;
    }
  }
}
