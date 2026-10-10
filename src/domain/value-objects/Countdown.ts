import { ValueObject } from '../shared/ValueObject';

interface CountdownProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export class Countdown extends ValueObject<CountdownProps> {
  static between(now: Date, target: Date): Countdown {
    const totalMs = Math.max(0, target.getTime() - now.getTime());
    return new Countdown({
      days: Math.floor(totalMs / DAY),
      hours: Math.floor((totalMs % DAY) / HOUR),
      minutes: Math.floor((totalMs % HOUR) / MINUTE),
      seconds: Math.floor((totalMs % MINUTE) / SECOND),
      totalMs,
    });
  }

  get days(): number {
    return this.props.days;
  }

  get hours(): number {
    return this.props.hours;
  }

  get minutes(): number {
    return this.props.minutes;
  }

  get seconds(): number {
    return this.props.seconds;
  }

  get totalMs(): number {
    return this.props.totalMs;
  }

  get isOver(): boolean {
    return this.props.totalMs === 0;
  }
}
