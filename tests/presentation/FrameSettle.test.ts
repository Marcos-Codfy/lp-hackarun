// o contexto WebGL só nasce com os frames no ritmo da tela por meio segundo (GPU livre), com teto
import { describe, expect, it } from 'vitest';
import { whenFramesSettle, type FrameClock } from '@presentation/experience/FrameSettle';

// relógio de mentira: frames e timers rodam quando o teste manda
function fakeClock() {
  let frame: ((now: number) => void) | null = null;
  const timers: { run: () => void; ms: number; live: boolean }[] = [];
  const clock: FrameClock = {
    frame: (run) => {
      frame = run;
    },
    timer: (run, ms) => {
      const timer = { run, ms, live: true };
      timers.push(timer);
      return () => {
        timer.live = false;
      };
    },
  };
  return {
    clock,
    // frames nos instantes dados (ms)
    frames(...times: number[]) {
      for (const now of times) {
        const run = frame;
        frame = null;
        run?.(now);
      }
    },
    // dispara os timers de um atraso (0 = "logo depois do frame", outro = o teto)
    fire(ms: number) {
      timers.filter((t) => t.live && t.ms === ms).forEach((t) => t.run());
    },
  };
}

const every = (start: number, step: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => start + i * step);

async function settled(promise: Promise<void>): Promise<boolean> {
  let done = false;
  void promise.then(() => (done = true));
  await Promise.resolve();
  await Promise.resolve();
  return done;
}

describe('whenFramesSettle', () => {
  it('meio segundo de frames a 60 Hz: libera fora do callback do frame', async () => {
    const fake = fakeClock();
    const promise = whenFramesSettle({ clock: fake.clock });

    fake.frames(...every(0, 16.7, 31));
    expect(await settled(promise)).toBe(false);

    fake.fire(0);
    expect(await settled(promise)).toBe(true);
  });

  it('frame atrasado (GPU ocupada) zera a sequência', async () => {
    const fake = fakeClock();
    const promise = whenFramesSettle({ clock: fake.clock });

    fake.frames(...every(0, 16.7, 20), 400, ...every(416.7, 16.7, 20));
    fake.fire(0);
    expect(await settled(promise)).toBe(false);

    fake.frames(...every(750, 16.7, 12));
    fake.fire(0);
    expect(await settled(promise)).toBe(true);
  });

  it('tela a 30 Hz também assenta (o ritmo é o da própria tela)', async () => {
    const fake = fakeClock();
    const promise = whenFramesSettle({ clock: fake.clock });

    fake.frames(...every(0, 33.3, 18));
    fake.fire(0);

    expect(await settled(promise)).toBe(true);
  });

  it('frame colado no anterior não vira a medida do ritmo (30 Hz seguiria travado)', async () => {
    const fake = fakeClock();
    const promise = whenFramesSettle({ clock: fake.clock });

    fake.frames(0, 2, ...every(35.3, 33.3, 18));
    fake.fire(0);

    expect(await settled(promise)).toBe(true);
  });

  it('o 1º intervalo travado não conta como liso', async () => {
    const fake = fakeClock();
    const promise = whenFramesSettle({ clock: fake.clock });

    fake.frames(0, 400, ...every(416.7, 16.7, 10));
    fake.fire(0);

    expect(await settled(promise)).toBe(false);
  });

  it('nunca fica liso (aba oculta, celular lento): o teto libera', async () => {
    const fake = fakeClock();
    const promise = whenFramesSettle({ clock: fake.clock, timeoutMs: 3000 });

    fake.frames(0, 120, 260, 420);
    fake.fire(3000);

    expect(await settled(promise)).toBe(true);
  });
});
