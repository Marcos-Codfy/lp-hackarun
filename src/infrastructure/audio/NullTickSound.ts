import type { TickSound } from '@application/ports/TickSound';

// null object: sem Web Audio
export class NullTickSound implements TickSound {
  play(): void {}
}
