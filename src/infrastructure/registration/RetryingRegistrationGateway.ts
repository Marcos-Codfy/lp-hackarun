import {
  RETRYABLE_FAILURES,
  RegistrationGatewayError,
  type RegistrationGateway,
  type RegistrationPayload,
  type RegistrationReceipt,
} from '@application/index';
import { wait, type Sleep } from '@shared/utils/async';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: Sleep;
  random?: () => number;
}

// decorator: tenta de novo só o que é passageiro (rede, servidor, fila cheia), com backoff exponencial + jitter.
// o payload é o mesmo (mesma chave de idempotência), então o servidor nunca grava duas vezes
export class RetryingRegistrationGateway implements RegistrationGateway {
  private readonly inner: RegistrationGateway;
  private readonly attempts: number;
  private readonly baseDelayMs: number;
  private readonly sleep: Sleep;
  private readonly random: () => number;

  constructor(inner: RegistrationGateway, options: RetryOptions = {}) {
    this.inner = inner;
    this.attempts = Math.max(1, options.attempts ?? 3);
    this.baseDelayMs = options.baseDelayMs ?? 700;
    this.sleep = options.sleep ?? wait;
    this.random = options.random ?? Math.random;
  }

  async submit(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.inner.submit(payload);
      } catch (error) {
        if (attempt >= this.attempts || !RetryingRegistrationGateway.isRetryable(error)) throw error;
        await this.sleep(this.delayFor(attempt));
      }
    }
  }

  // 700ms, 1.4s... + até 1x a base de jitter pra não sincronizar a galera toda
  delayFor(attempt: number): number {
    return Math.round(this.baseDelayMs * 2 ** (attempt - 1) + this.random() * this.baseDelayMs);
  }

  private static isRetryable(error: unknown): boolean {
    return error instanceof RegistrationGatewayError && RETRYABLE_FAILURES.has(error.kind);
  }
}
