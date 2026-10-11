import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';

interface TestEvents extends Record<string, unknown> {
  ping: { n: number };
  done: undefined;
}

describe('EventBus', () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => error.mockRestore());

  it('entrega o payload pra todos os handlers do evento', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('ping', a);
    bus.on('ping', b);

    bus.emit('ping', { n: 1 });

    expect(a).toHaveBeenCalledWith({ n: 1 });
    expect(b).toHaveBeenCalledWith({ n: 1 });
  });

  it('handler que lança não impede os outros nem estoura em quem emitiu', () => {
    const bus = new EventBus<TestEvents>();
    const after = vi.fn();
    bus.on('ping', () => {
      throw new Error('boom');
    });
    bus.on('ping', after);

    expect(() => bus.emit('ping', { n: 2 })).not.toThrow();
    expect(after).toHaveBeenCalledWith({ n: 2 });
    expect(error).toHaveBeenCalledWith('[bus] ping handler failed', expect.any(Error));
  });

  it('once ouve uma vez só, mesmo se quebrar', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn(() => {
      throw new Error('boom');
    });
    bus.once('done', handler);

    bus.emit('done', undefined);
    bus.emit('done', undefined);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('o unsubscribe tira o handler', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const off = bus.on('ping', handler);
    off();

    bus.emit('ping', { n: 3 });

    expect(handler).not.toHaveBeenCalled();
  });
});
