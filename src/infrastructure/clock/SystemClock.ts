import type { Clock } from '@application/index';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

// relógio parado, só pros testes (o ?now= do browser usa o ShiftedClock do client.ts, que continua andando)
export class FixedClock implements Clock {
  private readonly instant: Date;

  constructor(instant: Date) {
    this.instant = instant;
  }

  now(): Date {
    return new Date(this.instant);
  }
}
