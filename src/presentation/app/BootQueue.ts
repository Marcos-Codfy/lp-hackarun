// fila de passos do boot; quem monta coisa no browser só enxerga isto (DIP)
export interface BootSteps {
  add(name: string, run: () => void): void;
}

interface SchedulerLike {
  yield?: () => Promise<void>;
}

// devolve a thread pro navegador (input e paint passam na frente) e continua em seguida.
// scheduler.yield põe a continuação no começo da fila; sem ele, setTimeout 0
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerLike }).scheduler;
  if (typeof scheduler?.yield === 'function') return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// depois do próximo frame pintado (rAF roda antes do paint; o timeout, logo depois dele)
export function afterNextPaint(fn: () => void): void {
  requestAnimationFrame(() => setTimeout(fn, 0));
}

export function nextPaint(): Promise<void> {
  return new Promise((resolve) => afterNextPaint(resolve));
}

// roda e marca na trilha Timings do DevTools (dá pra ver quanto cada passo custa)
export function timed<T>(name: string, run: () => T): T {
  const start = performance.now();
  try {
    return run();
  } finally {
    try {
      performance.measure(name, { start });
    } catch {
      // navegador sem User Timing nível 3: só não marca
    }
  }
}

// 'yield': cede a thread e segue; 'paint': espera um frame (passo que mede a página lê o layout limpo)
export type BootPace = 'yield' | 'paint';

// boot fatiado: cada passo numa tarefa própria, nenhuma segura a thread por muito tempo;
// passo que quebra não derruba os seguintes
export class BootQueue implements BootSteps {
  private readonly steps: { name: string; run: () => void }[] = [];

  constructor(private readonly pace: BootPace = 'yield') {}

  add(name: string, run: () => void): void {
    this.steps.push({ name, run });
  }

  async run(): Promise<void> {
    for (let step = this.steps.shift(); step; step = this.steps.shift()) {
      await (this.pace === 'paint' ? nextPaint() : yieldToMain());
      try {
        timed(`boot:${step.name}`, step.run);
      } catch (error) {
        console.error(`[boot] ${step.name} failed`, error);
      }
    }
  }
}
