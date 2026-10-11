import { createHash } from 'node:crypto';

// dublês mínimos dos serviços do Apps Script: só o que o Code.gs, Validation.gs e Limits.gs usam

export type Cell = string | number | Date;

export class FakeSheet {
  readonly name: string;
  readonly rows: Cell[][] = [];

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  getLastRow(): number {
    return this.rows.length;
  }

  getMaxRows(): number {
    return 1000;
  }

  appendRow(row: Cell[]): this {
    this.rows.push([...row]);
    return this;
  }

  setFrozenRows(): this {
    return this;
  }

  getRange(row: number, col: number, numRows = 1, numCols = 1): FakeRange {
    return new FakeRange(this, row, col, numRows, numCols);
  }

  // linhas de dados (sem o cabeçalho)
  get data(): Cell[][] {
    return this.rows.slice(1);
  }
}

export class FakeRange {
  private readonly sheet: FakeSheet;
  private readonly row: number;
  private readonly col: number;
  private readonly numRows: number;
  private readonly numCols: number;

  constructor(sheet: FakeSheet, row: number, col: number, numRows: number, numCols: number) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues(): Cell[][] {
    return Array.from({ length: this.numRows }, (_, r) => {
      const source = this.sheet.rows[this.row - 1 + r] ?? [];
      return Array.from({ length: this.numCols }, (_, c) => source[this.col - 1 + c] ?? '');
    });
  }

  setValues(values: Cell[][]): this {
    values.forEach((line, r) => {
      const target = (this.sheet.rows[this.row - 1 + r] ??= []);
      line.forEach((value, c) => (target[this.col - 1 + c] = value));
    });
    return this;
  }

  setFontWeight(): this {
    return this;
  }

  setDataValidation(): this {
    return this;
  }
}

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
