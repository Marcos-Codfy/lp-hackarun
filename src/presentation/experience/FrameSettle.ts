// o getContext do WebGL e as primeiras consultas são síncronas e esperam o processo da GPU. Logo depois do
// 1º paint ela ainda está ocupada com a página (os efeitos e as entradas do hero em CSS) e cada chamada
// travava a thread por 40 a 130 ms. Frame atrasado é o sinal disso (o compositor só pede o próximo quando
// o anterior foi desenhado): espera os frames ficarem no ritmo por meio segundo e só então cria o contexto.
// O ritmo é o da própria tela (30, 60 ou 120 Hz), e um teto garante que o 3D nunca fica preso
const SMOOTH_MS = 500;
// frame "no ritmo": até 1,6x o intervalo da tela (o menor visto), nunca abaixo de 25 ms (60 Hz com folga).
// Intervalo curtíssimo é frame atrasado saindo colado no anterior: não serve de medida
const GAP_TOLERANCE = 1.6;
const MIN_TOLERATED_MS = 25;
const MIN_PACE_MS = 6;
const TIMEOUT_MS = 3000;

export interface FrameClock {
  frame(run: (now: number) => void): void;
  timer(run: () => void, ms: number): () => void;
}

const browserClock: FrameClock = {
  frame: (run) => {
    requestAnimationFrame(run);
  },
  timer: (run, ms) => {
    const id = setTimeout(run, ms);
    return () => clearTimeout(id);
  },
};

export interface FrameSettleOptions {
  smoothMs?: number;
  timeoutMs?: number;
  clock?: FrameClock;
}

export function whenFramesSettle({
  smoothMs = SMOOTH_MS,
  timeoutMs = TIMEOUT_MS,
  clock = browserClock,
}: FrameSettleOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let last: number | null = null;
    let since: number | null = null;
    let pace = Infinity;
    const finish = (): void => {
      if (done) return;
      done = true;
      stopTimer();
      resolve();
    };
    const stopTimer = clock.timer(finish, timeoutMs);
    const tick = (now: number): void => {
      if (done) return;
      if (last !== null) {
        const gap = now - last;
        // compara com o ritmo de antes deste frame (sem ritmo ainda, só a folga mínima)
        const limit = Number.isFinite(pace)
          ? Math.max(pace * GAP_TOLERANCE, MIN_TOLERATED_MS)
          : MIN_TOLERATED_MS;
        since = gap <= limit ? (since ?? last) : null;
        if (gap >= MIN_PACE_MS) pace = Math.min(pace, gap);
      }
      last = now;
      // fora do callback do frame: o getContext não atrasa o frame que acabou de sair
      if (since !== null && now - since >= smoothMs) clock.timer(finish, 0);
      else clock.frame(tick);
    };
    clock.frame(tick);
  });
}
