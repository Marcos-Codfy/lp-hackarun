// setup sob demanda: uma vez por elemento, um por tarefa, e cancelável
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApproachWatcher } from '@presentation/motion/core/ApproachWatcher';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

// observer de mentira: o teste decide quando o elemento "chega perto"
class FakeObserver {
  static last: FakeObserver | null = null;
  readonly observed = new Set<Element>();

  constructor(private readonly callback: Callback) {
    FakeObserver.last = this;
  }

  observe(el: Element): void {
    this.observed.add(el);
  }

  unobserve(el: Element): void {
    this.observed.delete(el);
  }

  disconnect(): void {
    this.observed.clear();
  }

  near(...targets: Element[]): void {
    this.callback(targets.map((target) => ({ target, isIntersecting: true })));
  }
}

const observer = (): FakeObserver => {
  if (!FakeObserver.last) throw new Error('observer não criado');
  return FakeObserver.last;
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  FakeObserver.last = null;
});

describe('ApproachWatcher', () => {
  it('roda o setup uma vez só, quando o elemento chega perto', () => {
    const watcher = new ApproachWatcher();
    const el = document.createElement('div');
    const setup = vi.fn();
    watcher.watch(el, setup);
    expect(setup).not.toHaveBeenCalled();

    observer().near(el);
    observer().near(el);

    expect(setup).toHaveBeenCalledTimes(1);
    expect(observer().observed.has(el)).toBe(false);
  });

  it('vários elementos juntos: o primeiro na hora, os outros em tarefas seguintes', async () => {
    const watcher = new ApproachWatcher();
    const [a, b] = [document.createElement('div'), document.createElement('div')];
    const ran: string[] = [];
    watcher.watch(a, () => ran.push('a'));
    watcher.watch(b, () => ran.push('b'));

    observer().near(a, b);
    expect(ran).toEqual(['a']);
    await flush();
    expect(ran).toEqual(['a', 'b']);
  });

  it('cancelado antes de chegar, não roda e para de observar', () => {
    const watcher = new ApproachWatcher();
    const el = document.createElement('div');
    const setup = vi.fn();
    const cancel = watcher.watch(el, setup);

    cancel();
    observer().near(el);

    expect(setup).not.toHaveBeenCalled();
    expect(observer().observed.has(el)).toBe(false);
  });

  it('um setup que quebra não leva os outros junto', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const watcher = new ApproachWatcher();
    const [a, b] = [document.createElement('div'), document.createElement('div')];
    const after = vi.fn();
    watcher.watch(a, () => {
      throw new Error('boom');
    });
    watcher.watch(b, after);

    observer().near(a, b);
    await flush();

    expect(after).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
