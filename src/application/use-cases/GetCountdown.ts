import { Countdown, Milestone } from '@domain/index';
import type { Clock } from '../ports/Clock';
import type { CountdownDTO, MilestoneDTO } from '../dto';

// roda no browser: recebe os marcos serializados e calcula quanto falta pro próximo
export class GetCountdown {
  private readonly clock: Clock;
  private readonly milestones: Milestone[];

  constructor(clock: Clock, milestones: MilestoneDTO[]) {
    this.clock = clock;
    this.milestones = milestones
      .map((m) => Milestone.create(m.key, m.label, new Date(m.at)))
      .sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  execute(): CountdownDTO {
    const now = this.clock.now();
    const next = this.milestones.find((m) => m.isAfter(now));
    if (!next) {
      return {
        key: null,
        label: 'Encerrado',
        target: null,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isOver: true,
      };
    }
    const c = Countdown.between(now, next.at);
    return {
      key: next.key,
      label: next.label,
      target: next.at.toISOString(),
      days: c.days,
      hours: c.hours,
      minutes: c.minutes,
      seconds: c.seconds,
      isOver: c.isOver,
    };
  }
}
