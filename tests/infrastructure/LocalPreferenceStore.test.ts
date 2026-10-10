import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalPreferenceStore } from '@infrastructure/storage/LocalPreferenceStore';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('LocalPreferenceStore', () => {
  it('grava com prefixo no localStorage', () => {
    const store = new LocalPreferenceStore();
    store.set('sound', 'on');
    expect(window.localStorage.getItem('hackarun:sound')).toBe('on');
    expect(store.get('sound')).toBe('on');
    store.remove('sound');
    expect(store.get('sound')).toBeNull();
  });

  it('aba anônima / storage bloqueado: segue funcionando em memória', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const store = new LocalPreferenceStore();
    expect(() => store.set('npc-found', '["a"]')).not.toThrow();
    expect(store.get('npc-found')).toBe('["a"]');
  });
});
