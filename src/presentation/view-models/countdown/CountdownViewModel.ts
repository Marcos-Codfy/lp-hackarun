import { Observable } from '@shared/core/Observable';
import type { Clock, CountdownDTO, GetCountdown } from '@application/index';

// só notifica quando muda o segundo (ou o marco)
const sameTick = (a: CountdownDTO, b: CountdownDTO): boolean =>
  a.key === b.key &&
  a.isOver === b.isOver &&
  a.seconds === b.seconds &&
  a.minutes === b.minutes &&
  a.hours === b.hours &&
  a.days === b.days;

// MVVM: estado do contador, sem DOM; a View só desenha
export class CountdownViewModel {
  readonly state: Observable<CountdownDTO>;
  private readonly useCase: GetCountdown;
  private readonly clock: Clock;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(useCase: GetCountdown, clock: Clock) {
    this.useCase = useCase;
    this.clock = clock;
    this.state = new Observable(useCase.execute(), sameTick);
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.tick();
  }

  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const next = this.useCase.execute();
    this.state.set(next);
    if (next.isOver) {
      this.stop();
      return;
    }
    // alinha logo depois da virada do segundo (marcos caem em segundo cheio) pra não "pular" dígito
    const delay = ((1000 - (this.clock.now().getTime() % 1000)) % 1000) + 5;
    this.timer = setTimeout(() => this.tick(), delay);
  }
}
