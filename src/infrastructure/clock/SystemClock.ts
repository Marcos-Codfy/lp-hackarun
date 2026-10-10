import type { Clock } from '@application/index';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

// relógio fixo: testes e preview de datas (?now=2026-11-14T16:00:00-03:00)
export class FixedClock implements Clock {
  private readonly instant: Date;

  constructor(instant: Date) {
    this.instant = instant;
  }

  now(): Date {
    return new Date(this.instant);
  }
}
