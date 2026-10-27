import {
  RETRYABLE_FAILURES,
  RegistrationGatewayError,
  type MentorPayload,
  type MentorRegistrationGateway,
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

// o que a inscrição e o cadastro de mentor têm em comum: um envio que devolve o recibo
interface Submitter<P> {
  submit(payload: P): Promise<RegistrationReceipt>;
}

// decorator: tenta de novo só o que é passageiro (rede, servidor, fila cheia), com backoff exponencial + jitter.
// o payload é o mesmo (mesma chave de idempotência), então o servidor nunca grava duas vezes
export class RetryingSubmitter<P> implements Submitter<P> {
  private readonly inner: Submitter<P>;
  private readonly attempts: number;
  private readonly baseDelayMs: number;
  private readonly sleep: Sleep;
  private readonly random: () => number;

  constructor(inner: Submitter<P>, options: RetryOptions = {}) {
    this.inner = inner;
    this.attempts = Math.max(1, options.attempts ?? 3);
    this.baseDelayMs = options.baseDelayMs ?? 700;
    this.sleep = options.sleep ?? wait;
    this.random = options.random ?? Math.random;
  }

  async submit(payload: P): Promise<RegistrationReceipt> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.inner.submit(payload);
      } catch (error) {
        if (attempt >= this.attempts || !RetryingSubmitter.isRetryable(error)) throw error;
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

export class RetryingRegistrationGateway
  extends RetryingSubmitter<RegistrationPayload>
  implements RegistrationGateway {}

export class RetryingMentorGateway
  extends RetryingSubmitter<MentorPayload>
  implements MentorRegistrationGateway {}
