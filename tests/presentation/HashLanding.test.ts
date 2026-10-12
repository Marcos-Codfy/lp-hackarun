// chegada com /#secao vinda de outra página: realinha no alvo depois que o pin das missões abre espaço
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { landOnHash, type RefreshEvents } from '@presentation/motion/core/HashLanding';
import type { ScrollDriver } from '@presentation/motion/core/ScrollDriver';

class FakeRefreshes implements RefreshEvents {
  readonly listeners = new Set<() => void>();
  addEventListener(_type: 'refresh', listener: () => void): void {
    this.listeners.add(listener);
  }
  removeEventListener(_type: 'refresh', listener: () => void): void {
    this.listeners.delete(listener);
  }
  fire(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function setup() {
  document.body.innerHTML = '<main><section id="inscricao"></section></main>';
  const driver = {
    scrollTo: vi.fn(),
    stop: vi.fn(),
    start: vi.fn(),
    destroy: vi.fn(),
  } satisfies ScrollDriver;
  const refreshes = new FakeRefreshes();
  const target = document.getElementById('inscricao');
  return { driver, refreshes, target };
}

describe('landOnHash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('alinha no alvo na hora e de novo a cada refresh do ScrollTrigger', () => {
    const { driver, refreshes, target } = setup();
    landOnHash(driver, refreshes, { hash: '#inscricao', navigation: 'navigate' });
    expect(driver.scrollTo).toHaveBeenCalledTimes(1);
    expect(driver.scrollTo).toHaveBeenLastCalledWith(target, { immediate: true });
    refreshes.fire();
    refreshes.fire();
    expect(driver.scrollTo).toHaveBeenCalledTimes(3);
  });

  it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])(
    'a pessoa mexeu (%s): para de realinhar',
    (type) => {
      const { driver, refreshes } = setup();
      landOnHash(driver, refreshes, { hash: '#inscricao', navigation: 'navigate' });
      window.dispatchEvent(new Event(type));
      refreshes.fire();
      expect(driver.scrollTo).toHaveBeenCalledTimes(1);
      expect(refreshes.listeners.size).toBe(0);
    },
  );

  it('para sozinho depois do prazo', () => {
    const { driver, refreshes } = setup();
    landOnHash(driver, refreshes, { hash: '#inscricao', navigation: 'navigate', ms: 3000 });
    vi.advanceTimersByTime(3000);
    refreshes.fire();
    expect(driver.scrollTo).toHaveBeenCalledTimes(1);
    expect(refreshes.listeners.size).toBe(0);
  });

  it.each([
    ['sem hash', '', 'navigate'],
    ['alvo que não existe', '#nada', 'navigate'],
    ['hash torto', '#%E0%A4%A', 'navigate'],
    ['recarregou a página', '#inscricao', 'reload'],
    ['voltou no histórico', '#inscricao', 'back_forward'],
  ])('%s: não mexe no scroll', (_case, hash, navigation) => {
    const { driver, refreshes } = setup();
    landOnHash(driver, refreshes, { hash, navigation });
    refreshes.fire();
    expect(driver.scrollTo).not.toHaveBeenCalled();
    expect(refreshes.listeners.size).toBe(0);
  });
});
