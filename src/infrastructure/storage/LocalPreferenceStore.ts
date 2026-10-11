import type { PreferenceStore } from '@application/ports/PreferenceStore';
import { MemoryPreferenceStore } from './MemoryPreferenceStore';

// localStorage pode lançar exceção (aba anônima, cota, bloqueio de cookies): tudo em try/catch
export class LocalPreferenceStore implements PreferenceStore {
  private readonly prefix: string;
  // se o storage falhar, a preferência ainda vale até fechar a aba
  private readonly memory = new MemoryPreferenceStore();

  constructor(prefix = 'hackarun:') {
    this.prefix = prefix;
  }

  get(key: string): string | null {
    try {
      return window.localStorage.getItem(this.prefix + key) ?? this.memory.get(key);
    } catch {
      return this.memory.get(key);
    }
  }

  set(key: string, value: string): void {
    this.memory.set(key, value);
    try {
      window.localStorage.setItem(this.prefix + key, value);
    } catch {
      // segue só com a memória
    }
  }

  remove(key: string): void {
    this.memory.remove(key);
    try {
      window.localStorage.removeItem(this.prefix + key);
    } catch {
      // nada a fazer
    }
  }
}
