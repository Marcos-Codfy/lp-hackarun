// fila do boot: ordem, uma tarefa por passo e passo quebrado não derruba os outros
import { describe, expect, it, vi } from 'vitest';
import { attempt, BootQueue } from '@presentation/app/BootQueue';

describe('BootQueue', () => {
  it('roda na ordem, cedendo a thread antes de cada passo', async () => {
    const order: string[] = [];
    const queue = new BootQueue();
    queue.add('a', () => order.push('a'));
    queue.add('b', () => order.push('b'));

    const done = queue.run();
    // nada roda na mesma tarefa de quem chamou
    expect(order).toEqual([]);
    await done;
    expect(order).toEqual(['a', 'b']);
  });

  it('segue depois de um passo que quebra', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ran: string[] = [];
    const queue = new BootQueue();
    queue.add('broken', () => {
      throw new Error('boom');
    });
    queue.add('next', () => ran.push('next'));

    await queue.run();

    expect(ran).toEqual(['next']);
    expect(error).toHaveBeenCalledWith('[boot] broken failed', expect.any(Error));
    error.mockRestore();
  });

  it('no ritmo de frame espera um requestAnimationFrame por passo', async () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const queue = new BootQueue('paint');
    queue.add('one', () => undefined);
    queue.add('two', () => undefined);

    await queue.run();

    expect(raf).toHaveBeenCalledTimes(2);
    raf.mockRestore();
  });

  it('passo adicionado durante a fila também roda', async () => {
    const ran: string[] = [];
    const queue = new BootQueue();
    queue.add('first', () => queue.add('late', () => ran.push('late')));

    await queue.run();

    expect(ran).toEqual(['late']);
  });
});

describe('attempt', () => {
  it('devolve o resultado do passo', () => {
    expect(
      attempt(
        'ok',
        () => 42,
        () => 0,
      ),
    ).toBe(42);
  });

  it('passo que quebra loga com o nome e devolve o plano B', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = attempt(
      'motion',
      (): string => {
        throw new Error('boom');
      },
      () => 'native',
    );

    expect(result).toBe('native');
    expect(error).toHaveBeenCalledWith('[boot] motion failed', expect.any(Error));
    error.mockRestore();
  });

  it('sem plano B só engole o erro', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      attempt('views', () => {
        throw new Error('boom');
      }),
    ).not.toThrow();
    error.mockRestore();
  });
});
