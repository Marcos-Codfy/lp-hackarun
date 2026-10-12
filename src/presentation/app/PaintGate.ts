// rAF + timeout só espera o frame da thread principal; a GPU ainda leva um tempo pra apresentar ele.
// O JS do app espera o navegador registrar o 1º conteúdo pintado (Paint Timing): assim o hero (LCP)
// não disputa banda, CPU nem GPU com o boot. Sem a API, ou com a aba oculta (nada pinta), o teto vale
const FCP = 'first-contentful-paint';
const MAX_WAIT_MS = 3000;

export interface PaintSignals {
  // o 1º conteúdo já foi pintado?
  painted(): boolean;
  // avisa quando pintar; null = navegador sem PerformanceObserver de paint
  observe(onPaint: () => void): (() => void) | null;
  timer(run: () => void, ms: number): () => void;
}

function browserSignals(): PaintSignals {
  const supported =
    typeof PerformanceObserver !== 'undefined' &&
    (PerformanceObserver.supportedEntryTypes ?? []).includes('paint');
  return {
    painted: () => typeof performance !== 'undefined' && performance.getEntriesByName(FCP).length > 0,
    observe: (onPaint) => {
      if (!supported) return null;
      const observer = new PerformanceObserver((list) => {
        if (list.getEntriesByName(FCP).length > 0) onPaint();
      });
      observer.observe({ type: 'paint', buffered: true });
      return () => observer.disconnect();
    },
    timer: (run, ms) => {
      const id = setTimeout(run, ms);
      return () => clearTimeout(id);
    },
  };
}

// roda uma vez, no que vier primeiro: o paint registrado ou o teto
export function afterFirstContentfulPaint(
  run: () => void,
  {
    maxWaitMs = MAX_WAIT_MS,
    signals = browserSignals(),
  }: { maxWaitMs?: number; signals?: PaintSignals } = {},
): void {
  if (signals.painted()) {
    run();
    return;
  }
  let done = false;
  const stops: (() => void)[] = [];
  const finish = () => {
    if (done) return;
    done = true;
    stops.forEach((stop) => stop());
    run();
  };
  stops.push(signals.timer(finish, maxWaitMs));
  const stopObserving = signals.observe(finish);
  if (stopObserving) stops.push(stopObserving);
  else finish();
}
