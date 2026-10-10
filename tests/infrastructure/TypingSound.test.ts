import { describe, expect, it, vi } from 'vitest';
import { AudioSprite } from '@infrastructure/audio/AudioSprite';
import { MinIntervalGate } from '@infrastructure/audio/MinIntervalGate';
import { TypingSound } from '@infrastructure/audio/TypingSound';
import type { AudioEngine } from '@infrastructure/audio/AudioEngine';

describe('MinIntervalGate', () => {
  it('deixa passar no máximo um disparo por intervalo', () => {
    const gate = new MinIntervalGate(35);
    expect(gate.tryPass(0)).toBe(true);
    expect(gate.tryPass(20)).toBe(false);
    expect(gate.tryPass(34.9)).toBe(false);
    expect(gate.tryPass(35)).toBe(true);
    expect(gate.tryPass(100)).toBe(true);
  });
});

describe('AudioSprite', () => {
  const sprite = AudioSprite.uniform(6, 0.09, { min: 0.92, max: 1.08 });

  it('monta slots colados a partir do zero', () => {
    expect(sprite.slots).toHaveLength(6);
    expect(sprite.slots[0]).toEqual({ offset: 0, duration: 0.09 });
    expect(sprite.slots[5]?.offset).toBeCloseTo(0.45);
  });

  it('sorteia slot e tom dentro dos limites', () => {
    expect(sprite.pick(() => 0)).toEqual({ slot: sprite.slots[0], rate: 0.92 });
    const last = sprite.pick(() => 0.999999);
    expect(last.slot).toBe(sprite.slots[5]);
    expect(last.rate).toBeCloseTo(1.08, 4);
  });

  it('não aceita sprite vazio', () => {
    expect(() => new AudioSprite([], { min: 1, max: 1 })).toThrow();
  });
});

function fakeEngine(time: { now: number }) {
  const started: [number, number, number][] = [];
  const source = () => ({
    buffer: null as unknown,
    playbackRate: { value: 1 },
    connect: (node: unknown) => node,
    addEventListener: vi.fn(),
    start: (when: number, offset: number, duration: number) => started.push([when, offset, duration]),
  });
  const gain = () => ({ gain: { value: 1 }, connect: (node: unknown) => node, disconnect: vi.fn() });
  const context = {
    state: 'running',
    get currentTime() {
      return time.now;
    },
    createBufferSource: source,
    createGain: gain,
    decodeAudioData: vi.fn(async () => ({ duration: 0.54 })),
  };
  const engine = { context, output: {} } as unknown as AudioEngine;
  return { engine, started, context };
}

const okResponse = () =>
  new Response(new ArrayBuffer(8), { status: 200, headers: { 'content-type': 'audio/wav' } });

describe('TypingSound', () => {
  it('decodifica uma vez, toca um slot e respeita o intervalo mínimo', async () => {
    const time = { now: 0 };
    const { engine, started, context } = fakeEngine(time);
    const fetchFn = vi.fn(async () => okResponse());
    const sound = new TypingSound(engine, '/audio/ui-typing.wav', {
      sprite: AudioSprite.uniform(6, 0.09, { min: 0.92, max: 1.08 }),
      gate: new MinIntervalGate(35),
      gain: 0.18,
      random: () => 0.5,
      fetchFn,
    });

    sound.preload();
    await vi.waitFor(() => expect(context.decodeAudioData).toHaveBeenCalledTimes(1));
    await Promise.resolve();

    sound.play();
    time.now = 0.01;
    sound.play();
    time.now = 0.05;
    sound.play();

    expect(started).toHaveLength(2);
    expect(started[0]).toEqual([0, 0.27, 0.09]);
    sound.preload();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('fica mudo se o arquivo não for áudio', async () => {
    const { engine, started, context } = fakeEngine({ now: 0 });
    const sound = new TypingSound(engine, '/x', {
      sprite: AudioSprite.uniform(1, 0.09, { min: 1, max: 1 }),
      gate: new MinIntervalGate(0),
      gain: 0.18,
      fetchFn: async () => new Response('<html>', { headers: { 'content-type': 'text/html' } }),
    });
    sound.preload();
    await new Promise((r) => setTimeout(r, 0));
    sound.play();
    expect(context.decodeAudioData).not.toHaveBeenCalled();
    expect(started).toHaveLength(0);
  });
});
