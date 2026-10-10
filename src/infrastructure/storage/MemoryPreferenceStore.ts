import type { PreferenceStore } from './PreferenceStore';

// guarda só enquanto a página está aberta (testes, SSR, navegador sem storage)
export class MemoryPreferenceStore implements PreferenceStore {
  private readonly data = new Map<string, string>();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }
}
