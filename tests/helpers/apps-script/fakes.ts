import { createHash } from 'node:crypto';

// dublês mínimos dos serviços do Apps Script (cache, lock e hash); a planilha fica no sheetFakes.ts

export type { Cell } from './sheetFakes';

// sem expiração: os testes controlam o tempo pelas chaves (minuto/janela), igual ao script
export class FakeCache {
  readonly store = new Map<string, string>();

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  put(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  getAll(keys: string[]): Record<string, string> {
    const found: Record<string, string> = {};
    keys.forEach((key) => {
      const value = this.store.get(key);
      if (value !== undefined) found[key] = value;
    });
    return found;
  }

  putAll(values: Record<string, string>): void {
    Object.entries(values).forEach(([key, value]) => this.store.set(key, value));
  }
}

export class FakeLock {
  busy = false;
  held = false;

  waitLock(): void {
    if (this.busy) throw new Error('Lock timeout');
    this.held = true;
  }

  releaseLock(): void {
    this.held = false;
  }
}

// Utilities.computeDigest devolve bytes com sinal (-128..127), como no Java
export function signedSha256(text: string): number[] {
  return Array.from(createHash('sha256').update(text, 'utf8').digest(), (b) => (b > 127 ? b - 256 : b));
}
