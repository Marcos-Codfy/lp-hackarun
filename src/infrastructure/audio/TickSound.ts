// som curtinho de interface (clique de tecla): dispara e esquece, nunca bloqueia quem chamou
export interface TickSound {
  play(): void;
  // baixa/decodifica antes da primeira vez
  preload?(): void;
}

// null object: sem Web Audio
export class NullTickSound implements TickSound {
  play(): void {}
}
