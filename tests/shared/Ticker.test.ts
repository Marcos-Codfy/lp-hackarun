// loop compartilhado: um callback quebrado não pode parar os outros nem o requestAnimationFrame
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ticker } from '@shared/core/Ticker';

const START_MS = 1000;

// rAF manual: cada flush roda os frames pedidos até ali
class ManualFrames {
  private readonly queue = new Map<number, FrameRequestCallback>();
  private id = 0;
  private now = START_MS;

  readonly request = (cb: FrameRequestCallback): number => {
    this.id += 1;
    this.queue.set(this.id, cb);
    return this.id;
  };

  readonly cancel = (id: number): void => {
    this.queue.delete(id);
  };

  get pending(): number {
    return this.queue.size;
  }

  flush(stepMs = 16): void {
    this.now += stepMs;
    const due = [...this.queue.values()];
    this.queue.clear();
    due.forEach((cb) => cb(this.now));
  }
}

describe('Ticker', () => {
  let frames: ManualFrames;
  let error: ReturnType<typeof vi.spyOn>;
  const offs: (() => void)[] = [];

  beforeEach(() => {
    frames = new ManualFrames();
    vi.stubGlobal('requestAnimationFrame', frames.request);
    vi.stubGlobal('cancelAnimationFrame', frames.cancel);
    vi.spyOn(performance, 'now').mockReturnValue(START_MS);
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    // o singleton sobrevive entre os testes: sai todo mundo pra ele parar
    offs.splice(0).forEach((off) => off());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const add = (fn: (time: number, delta: number) => void): void => {
    offs.push(Ticker.shared.add(fn));
  };

  it('callback que lança não impede os outros no mesmo frame', () => {
    const before = vi.fn();
    const after = vi.fn();
    add(before);
    add(() => {
      throw new Error('boom');
    });
    add(after);

    frames.flush();

    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('[ticker] callback failed', expect.any(Error));
  });

  it('o loop continua nos frames seguintes depois de uma falha', () => {
    const healthy = vi.fn();
    const broken = vi.fn(() => {
      throw new Error('boom');
    });
    add(broken);
    add(healthy);

    frames.flush();
    frames.flush();
    frames.flush();

    expect(healthy).toHaveBeenCalledTimes(3);
    expect(broken).toHaveBeenCalledTimes(3);
    expect(frames.pending).toBe(1);
    // uma linha por callback quebrado, não uma por frame
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('para quando o último sai, mesmo saindo durante o frame', () => {
    const off = Ticker.shared.add(() => off());
    frames.flush();
    expect(frames.pending).toBe(0);
  });

  it('delta em segundos, limitado a 0,1 depois de uma pausa longa', () => {
    const deltas: number[] = [];
    add((_time, delta) => deltas.push(delta));

    frames.flush(16);
    frames.flush(5000);

    expect(deltas[0]).toBeCloseTo(0.016, 6);
    expect(deltas[1]).toBe(0.1);
  });
});
