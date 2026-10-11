import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Observable } from '@shared/core/Observable';

describe('Observable', () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => error.mockRestore());

  it('avisa com o valor novo e o anterior; valor igual não dispara', () => {
    const state = new Observable(1);
    const listener = vi.fn();
    state.subscribe(listener, { immediate: false });

    state.set(2);
    state.set(2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 1);
  });

  it('listener que lança não impede os outros nem desfaz a escrita', () => {
    const state = new Observable('a');
    const after = vi.fn();
    state.subscribe(
      () => {
        throw new Error('boom');
      },
      { immediate: false },
    );
    state.subscribe(after, { immediate: false });

    expect(() => state.set('b')).not.toThrow();
    expect(state.value).toBe('b');
    expect(after).toHaveBeenCalledWith('b', 'a');
    expect(error).toHaveBeenCalledWith('[observable] listener failed', expect.any(Error));
  });

  it('subscribe dispara na hora com o valor atual', () => {
    const state = new Observable(7);
    const listener = vi.fn();
    state.subscribe(listener);
    expect(listener).toHaveBeenCalledWith(7, 7);
  });
});
