// pausa do 3D: um frame parado e, ao retomar, o relógio segue de onde parou (sem pular o tempo em pausa)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameLoop } from '@presentation/experience/FrameLoop';
import { MOTION_PAUSED_CLASS } from '@presentation/views/motion/MotionPauseSignal';

const frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
let nowMs = 0;

// roda os rAF pendentes no instante dado (ms)
function flush(at: number): void {
  nowMs = at;
  const due = [...frames.values()];
  frames.clear();
  due.forEach((cb) => cb(at));
}

const flushObservers = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  frames.clear();
  nowMs = 1000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.set(++nextId, cb);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
});

afterEach(() => {
  document.documentElement.classList.remove(MOTION_PAUSED_CLASS);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FrameLoop (pausa)', () => {
  it('para no frame parado e retoma sem salto', async () => {
    const onFrame = vi.fn();
    const loop = new FrameLoop(onFrame, true);
    loop.start();
    flush(1016);
    expect(onFrame).toHaveBeenLastCalledWith(1.016, expect.any(Number));

    nowMs = 1020;
    document.documentElement.classList.add(MOTION_PAUSED_CLASS);
    await flushObservers();
    flush(1033);
    // um frame avulso com o tempo parado no instante da pausa, e mais nada
    expect(onFrame).toHaveBeenLastCalledWith(1.02, 0);
    const calls = onFrame.mock.calls.length;
    flush(1050);
    flush(1066);
    expect(onFrame.mock.calls.length).toBe(calls);

    // resize em pausa: redesenha o mesmo instante
    loop.invalidate();
    flush(3000);
    expect(onFrame).toHaveBeenLastCalledWith(1.02, 0);

    nowMs = 5020;
    document.documentElement.classList.remove(MOTION_PAUSED_CLASS);
    await flushObservers();
    flush(5036);
    const [time] = onFrame.mock.lastCall as [number, number];
    expect(time).toBeCloseTo(1.036, 5);
    loop.dispose();
  });

  it('montado já em pausa desenha o 1º frame (o palco precisa aparecer)', () => {
    document.documentElement.classList.add(MOTION_PAUSED_CLASS);
    const onFrame = vi.fn();
    const loop = new FrameLoop(onFrame, true);
    loop.start();
    flush(1016);
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenLastCalledWith(1, 0);
    flush(1033);
    expect(onFrame).toHaveBeenCalledTimes(1);
    loop.dispose();
  });
});
