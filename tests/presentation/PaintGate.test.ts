// o chunk do app só sai depois do 1º conteúdo pintado (Paint Timing), uma vez, com teto
import { describe, expect, it, vi } from 'vitest';
import { afterFirstContentfulPaint, type PaintSignals } from '@presentation/app/PaintGate';

// sinais de mentira: o teste decide quando pinta e quando o teto estoura
function fakeSignals({ painted = false, supported = true } = {}) {
  const state = {
    onPaint: null as (() => void) | null,
    onTimeout: null as (() => void) | null,
    stopped: 0,
  };
  const signals: PaintSignals = {
    painted: () => painted,
    observe: (onPaint) => {
      if (!supported) return null;
      state.onPaint = onPaint;
      return () => state.stopped++;
    },
    timer: (run) => {
      state.onTimeout = run;
      return () => state.stopped++;
    },
  };
  return { signals, state };
}

describe('afterFirstContentfulPaint', () => {
  it('já pintou: roda na hora, sem observer nem teto', () => {
    const { signals, state } = fakeSignals({ painted: true });
    const run = vi.fn();

    afterFirstContentfulPaint(run, { signals });

    expect(run).toHaveBeenCalledTimes(1);
    expect(state.onPaint).toBeNull();
    expect(state.onTimeout).toBeNull();
  });

  it('espera o paint e roda uma vez só, desligando observer e teto', () => {
    const { signals, state } = fakeSignals();
    const run = vi.fn();

    afterFirstContentfulPaint(run, { signals });
    expect(run).not.toHaveBeenCalled();

    state.onPaint?.();
    state.onTimeout?.();
    state.onPaint?.();

    expect(run).toHaveBeenCalledTimes(1);
    expect(state.stopped).toBe(2);
  });

  it('nada pintou (aba oculta): o teto sobe o app', () => {
    const { signals, state } = fakeSignals();
    const run = vi.fn();

    afterFirstContentfulPaint(run, { signals });
    state.onTimeout?.();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('navegador sem Paint Timing: roda na hora (o App ainda espera um frame)', () => {
    const { signals } = fakeSignals({ supported: false });
    const run = vi.fn();

    afterFirstContentfulPaint(run, { signals });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('sem sinais injetados usa o navegador e não quebra no ambiente de teste', async () => {
    const run = vi.fn();

    afterFirstContentfulPaint(run, { maxWaitMs: 5 });

    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  });
});
