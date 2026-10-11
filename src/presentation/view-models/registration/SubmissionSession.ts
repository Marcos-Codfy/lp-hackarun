import type { Clock, SubmissionMeta } from '@application/index';
import { newIdempotencyKey } from './idempotencyKey';

// uma sessão do formulário: o tempo do anti-robô conta desde que o formulário montou (autofill e colar
// não "zeram" nada) e a chave de idempotência vale pra todo reenvio até a inscrição entrar
export class SubmissionSession {
  private readonly clock: Clock;
  private readonly newKey: () => string;
  private readonly createdAt: number;
  private key: string;
  private source = 'landing-page';

  constructor(clock: Clock, newKey: () => string = newIdempotencyKey) {
    this.clock = clock;
    this.newKey = newKey;
    this.createdAt = clock.now().getTime();
    this.key = newKey();
  }

  setSource(source: string): void {
    this.source = source;
  }

  meta(honeypot: string): SubmissionMeta {
    return {
      honeypot,
      elapsedMs: this.clock.now().getTime() - this.createdAt,
      source: this.source,
      idempotencyKey: this.key,
    };
  }

  // inscrição entrou: o próximo envio (outra pessoa no mesmo aparelho) é outro envio
  complete(): void {
    this.key = this.newKey();
  }
}
