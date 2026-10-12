import type { Clock, SubmissionMeta } from '@application/index';
import { isIdempotencyKey, newIdempotencyKey } from './idempotencyKey';

// uma sessão do formulário: o tempo do anti-robô conta desde que o formulário montou (autofill e colar
// não "zeram" nada) e a chave de idempotência vale pra todo reenvio até a inscrição entrar
export class SubmissionSession {
  private readonly clock: Clock;
  private readonly newKey: () => string;
  private readonly createdAt: number;
  private currentKey: string;
  private source = 'landing-page';

  constructor(clock: Clock, newKey: () => string = newIdempotencyKey) {
    this.clock = clock;
    this.newKey = newKey;
    this.createdAt = clock.now().getTime();
    this.currentKey = newKey();
  }

  setSource(source: string): void {
    this.source = source;
  }

  get key(): string {
    return this.currentKey;
  }

  // rascunho recuperado: o envio continua o mesmo (se a resposta se perdeu e a pessoa recarregou, o servidor
  // acha a inscrição pela chave e devolve o protocolo em vez de acusar nome ou e-mail repetido)
  resume(key: string): void {
    if (isIdempotencyKey(key)) this.currentKey = key;
  }

  meta(honeypot: string): SubmissionMeta {
    return {
      honeypot,
      elapsedMs: this.clock.now().getTime() - this.createdAt,
      source: this.source,
      idempotencyKey: this.currentKey,
    };
  }

  // inscrição entrou: o próximo envio (outra pessoa no mesmo aparelho) é outro envio
  complete(): void {
    this.currentKey = this.newKey();
  }
}
